"""Авторизация: регистрация, вход, получение профиля, выход."""
import json
import os
import hashlib
import hmac
import time
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p62618369_ai_ugc_gaming_servic')

AVATARS = ['🚀', '🦁', '🦊', '🐺', '🐉', '🦋', '🎯', '💎', '🧠', '⚡', '🔥', '🌟']


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def make_token() -> str:
    return secrets.token_hex(32)


def ok(data: dict, status: int = 200) -> dict:
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data)}


def err(msg: str, status: int = 400) -> dict:
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '').rstrip('/')
    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    token = event.get('headers', {}).get('X-Session-Token', '')

    action = body.get('action', '') if method == 'POST' else (event.get('queryStringParameters') or {}).get('action', 'me')

    if action == 'register':
        return register(body)
    if action == 'login':
        return login(body)
    if action == 'telegram':
        return telegram_login(body)
    if action == 'telegram_webapp':
        return telegram_webapp_login(body)
    if action == 'logout':
        return logout(token)

    return get_me(token)


def register(body: dict) -> dict:
    username = (body.get('username') or '').strip()
    email = (body.get('email') or '').strip().lower()
    password = body.get('password') or ''

    if not username or not email or not password:
        return err('Заполните все поля')
    if len(username) < 3:
        return err('Имя минимум 3 символа')
    if len(password) < 6:
        return err('Пароль минимум 6 символов')
    if '@' not in email:
        return err('Неверный email')

    import random
    avatar = random.choice(AVATARS)
    pw_hash = hash_password(password)
    token = make_token()

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username = %s OR email = %s", (username, email))
    if cur.fetchone():
        conn.close()
        return err('Пользователь уже существует')

    cur.execute(
        f"INSERT INTO {SCHEMA}.users (username, email, password_hash, avatar) VALUES (%s, %s, %s, %s) RETURNING id",
        (username, email, pw_hash, avatar)
    )
    user_id = cur.fetchone()[0]
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)",
        (user_id, token)
    )
    conn.commit()
    conn.close()

    return ok({'token': token, 'user': {'id': user_id, 'username': username, 'email': email, 'avatar': avatar, 'xp': 0, 'level': 1, 'streak': 0}})


def login(body: dict) -> dict:
    login_val = (body.get('login') or '').strip().lower()
    password = body.get('password') or ''

    if not login_val or not password:
        return err('Заполните все поля')

    pw_hash = hash_password(password)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, username, email, avatar, xp, level, streak FROM {SCHEMA}.users WHERE (LOWER(email) = %s OR LOWER(username) = %s) AND password_hash = %s",
        (login_val, login_val, pw_hash)
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return err('Неверный логин или пароль')

    user_id, username, email, avatar, xp, level, streak = row
    token = make_token()
    cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, token))
    conn.commit()
    conn.close()

    return ok({'token': token, 'user': {'id': user_id, 'username': username, 'email': email, 'avatar': avatar, 'xp': xp, 'level': level, 'streak': streak}})


def verify_telegram(data: dict, bot_token: str) -> bool:
    received_hash = data.get('hash', '')
    if not received_hash:
        return False
    pairs = []
    for k in sorted(data.keys()):
        if k == 'hash':
            continue
        pairs.append(f"{k}={data[k]}")
    check_string = '\n'.join(pairs)
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    calc_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calc_hash, received_hash)


def verify_webapp_init_data(init_data: str, bot_token: str):
    """Проверка initData из Telegram Mini App. Возвращает dict пользователя или None."""
    try:
        from urllib.parse import parse_qsl
    except Exception:
        return None
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop('hash', '')
    if not received_hash:
        return None
    pairs = [f"{k}={parsed[k]}" for k in sorted(parsed.keys())]
    check_string = '\n'.join(pairs)
    secret_key = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
    calc_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc_hash, received_hash):
        return None
    auth_date = int(parsed.get('auth_date', '0') or 0)
    if auth_date and (time.time() - auth_date) > 86400:
        return None
    user_json = parsed.get('user')
    if not user_json:
        return None
    return json.loads(user_json)


def upsert_tg_user(tg: dict) -> dict:
    tg_id = int(tg.get('id'))
    first = str(tg.get('first_name', '') or '')
    last = str(tg.get('last_name', '') or '')
    tg_username = str(tg.get('username', '') or '')
    photo = str(tg.get('photo_url', '') or '')

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"SELECT id, username, email, avatar, xp, level, streak FROM {SCHEMA}.users WHERE telegram_id = %s",
        (tg_id,)
    )
    row = cur.fetchone()

    if not row:
        base = tg_username or (first + last) or f"tg{tg_id}"
        base = ''.join(ch for ch in base if ch.isalnum() or ch == '_')[:40] or f"tg{tg_id}"
        username = base
        cur.execute(f"SELECT 1 FROM {SCHEMA}.users WHERE username = %s", (username,))
        if cur.fetchone():
            username = f"{base}_{tg_id}"[:50]
        email = f"tg{tg_id}@telegram.local"
        avatar = photo if photo else '🚀'
        pw_hash = hash_password(secrets.token_hex(16))
        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (username, email, password_hash, avatar, telegram_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, username, email, avatar, xp, level, streak""",
            (username, email, pw_hash, avatar, tg_id)
        )
        row = cur.fetchone()

    user_id, username, email, avatar, xp, level, streak = row
    new_token = make_token()
    cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (user_id, new_token))
    conn.commit()
    conn.close()

    return {'token': new_token, 'user': {'id': user_id, 'username': username, 'email': email, 'avatar': avatar, 'xp': xp, 'level': level, 'streak': streak}}


def telegram_login(body: dict) -> dict:
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token:
        return err('Telegram-вход не настроен', 500)

    tg = body.get('telegram') or {}
    tg = {k: str(v) for k, v in tg.items() if v is not None}

    if not verify_telegram(tg, bot_token):
        return err('Не удалось подтвердить вход через Telegram', 403)

    auth_date = int(tg.get('auth_date', '0') or 0)
    if auth_date and (time.time() - auth_date) > 86400:
        return err('Данные Telegram устарели, попробуйте снова', 403)

    return ok(upsert_tg_user(tg))


def telegram_webapp_login(body: dict) -> dict:
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    if not bot_token:
        return err('Telegram-вход не настроен', 500)

    init_data = body.get('init_data') or ''
    if not init_data:
        return err('Нет данных Telegram', 400)

    tg = verify_webapp_init_data(init_data, bot_token)
    if not tg:
        return err('Не удалось подтвердить вход через Telegram', 403)

    return ok(upsert_tg_user(tg))


def get_me(token: str) -> dict:
    if not token:
        return err('Не авторизован', 401)

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        f"""SELECT u.id, u.username, u.email, u.avatar, u.xp, u.level, u.streak
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        return err('Сессия истекла', 401)

    user_id, username, email, avatar, xp, level, streak = row
    return ok({'user': {'id': user_id, 'username': username, 'email': email, 'avatar': avatar, 'xp': xp, 'level': level, 'streak': streak}})


def logout(token: str) -> dict:
    if not token:
        return ok({'ok': True})
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
    conn.commit()
    conn.close()
    return ok({'ok': True})