"""Админка: управление пользователями, уроками и миссиями. Доступ только для is_admin."""
import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p62618369_ai_ugc_gaming_servic')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def get_admin(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username, u.email, u.is_admin
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    row = cur.fetchone()
    if not row or not row[3]:
        return None
    return row


def handler(event: dict, context) -> dict:
    """Управление платформой для администратора: пользователи, уроки, миссии."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    qs = event.get('queryStringParameters') or {}
    if qs:
        for k, v in qs.items():
            body.setdefault(k, v)

    token = event.get('headers', {}).get('X-Session-Token', '')
    action = body.get('action', '') if method == 'POST' else qs.get('action', '')

    conn = get_conn()
    cur = conn.cursor()
    try:
        if action == 'seed_admin':
            return seed_admin(cur, conn, body)
        if action == 'login':
            return admin_login(cur, conn, body)

        admin = get_admin(cur, token)
        if not admin:
            return err('Доступ только для администратора', 403)

        if action == 'dashboard':
            return dashboard(cur)
        if action == 'list_users':
            return list_users(cur)
        if action == 'update_user':
            return update_user(cur, conn, body)
        if action == 'delete_user':
            return delete_user(cur, conn, body, admin[0])
        if action == 'list_lessons':
            return list_lessons(cur)
        if action == 'save_lesson':
            return save_lesson(cur, conn, body)
        if action == 'delete_lesson':
            return delete_lesson(cur, conn, body)
        if action == 'list_missions':
            return list_missions(cur)
        if action == 'save_mission':
            return save_mission(cur, conn, body)
        if action == 'delete_mission':
            return delete_mission(cur, conn, body)

        return err('Неизвестное действие')
    finally:
        conn.close()


def seed_admin(cur, conn, body):
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE is_admin = true")
    if cur.fetchone()[0] > 0:
        return err('Администратор уже существует', 403)
    username = (body.get('username') or 'admin').strip()
    email = (body.get('email') or 'admin@yougen.app').strip().lower()
    password = body.get('password') or ''
    if len(password) < 6:
        return err('Пароль минимум 6 символов')
    pw_hash = hash_password(password)
    cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE LOWER(email) = %s OR LOWER(username) = %s",
                (email, username.lower()))
    existing = cur.fetchone()
    if existing:
        cur.execute(f"UPDATE {SCHEMA}.users SET password_hash = %s, is_admin = true WHERE id = %s",
                    (pw_hash, existing[0]))
    else:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (username, email, password_hash, avatar, is_admin)
                VALUES (%s, %s, %s, %s, true)""",
            (username, email, pw_hash, '🛡️')
        )
    conn.commit()
    return ok({'ok': True})


def admin_login(cur, conn, body):
    login_val = (body.get('login') or '').strip().lower()
    password = body.get('password') or ''
    if not login_val or not password:
        return err('Заполните все поля')
    pw_hash = hash_password(password)
    cur.execute(
        f"""SELECT id, username, email FROM {SCHEMA}.users
            WHERE (LOWER(email) = %s OR LOWER(username) = %s)
              AND password_hash = %s AND is_admin = true""",
        (login_val, login_val, pw_hash)
    )
    row = cur.fetchone()
    if not row:
        return err('Неверный логин/пароль или нет прав администратора', 403)
    token = secrets.token_hex(32)
    cur.execute(f"INSERT INTO {SCHEMA}.sessions (user_id, token) VALUES (%s, %s)", (row[0], token))
    conn.commit()
    return ok({'token': token, 'admin': {'id': row[0], 'username': row[1], 'email': row[2]}})


def dashboard(cur):
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
    users = cur.fetchone()[0]
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.lessons")
    lessons = cur.fetchone()[0]
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.missions")
    missions = cur.fetchone()[0]
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.portfolio_posts")
    posts = cur.fetchone()[0]
    return ok({'users': users, 'lessons': lessons, 'missions': missions, 'posts': posts})


def list_users(cur):
    cur.execute(
        f"""SELECT id, username, email, avatar, xp, level, streak, is_admin, created_at
            FROM {SCHEMA}.users ORDER BY id DESC"""
    )
    cols = ['id', 'username', 'email', 'avatar', 'xp', 'level', 'streak', 'is_admin', 'created_at']
    return ok({'users': [dict(zip(cols, r)) for r in cur.fetchall()]})


def update_user(cur, conn, body):
    uid = body.get('id')
    if not uid:
        return err('Нет id')
    cur.execute(
        f"UPDATE {SCHEMA}.users SET xp = %s, level = %s, streak = %s, is_admin = %s WHERE id = %s",
        (int(body.get('xp', 0)), int(body.get('level', 1)), int(body.get('streak', 0)),
         bool(body.get('is_admin', False)), uid)
    )
    conn.commit()
    return ok({'ok': True})


def delete_user(cur, conn, body, admin_id):
    uid = body.get('id')
    if not uid:
        return err('Нет id')
    if int(uid) == int(admin_id):
        return err('Нельзя удалить самого себя')
    cur.execute(f"DELETE FROM {SCHEMA}.sessions WHERE user_id = %s", (uid,))
    cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = %s", (uid,))
    conn.commit()
    return ok({'ok': True})


def list_lessons(cur):
    cur.execute(
        f"""SELECT id, day_number, title, subtitle, duration_min, phase, checklist,
                   sort_order, video_url, video_xp, cover_url
            FROM {SCHEMA}.lessons ORDER BY day_number, sort_order"""
    )
    cols = ['id', 'day_number', 'title', 'subtitle', 'duration_min', 'phase', 'checklist',
            'sort_order', 'video_url', 'video_xp', 'cover_url']
    return ok({'lessons': [dict(zip(cols, r)) for r in cur.fetchall()]})


def save_lesson(cur, conn, body):
    checklist = json.dumps(body.get('checklist', []))
    if body.get('id'):
        cur.execute(
            f"""UPDATE {SCHEMA}.lessons SET day_number=%s, title=%s, subtitle=%s,
                duration_min=%s, phase=%s, checklist=%s, sort_order=%s, video_url=%s,
                video_xp=%s, cover_url=%s WHERE id=%s""",
            (int(body.get('day_number', 1)), body.get('title', ''), body.get('subtitle', ''),
             int(body.get('duration_min', 10)), body.get('phase', 'prep'), checklist,
             int(body.get('sort_order', 0)), body.get('video_url', ''),
             int(body.get('video_xp', 30)), body.get('cover_url', ''), body['id'])
        )
    else:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.lessons (day_number, title, subtitle, duration_min,
                phase, checklist, sort_order, video_url, video_xp, cover_url)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (int(body.get('day_number', 1)), body.get('title', ''), body.get('subtitle', ''),
             int(body.get('duration_min', 10)), body.get('phase', 'prep'), checklist,
             int(body.get('sort_order', 0)), body.get('video_url', ''),
             int(body.get('video_xp', 30)), body.get('cover_url', ''))
        )
    conn.commit()
    return ok({'ok': True})


def delete_lesson(cur, conn, body):
    lid = body.get('id')
    if not lid:
        return err('Нет id')
    cur.execute(f"DELETE FROM {SCHEMA}.user_lessons WHERE lesson_id = %s", (lid,))
    cur.execute(f"DELETE FROM {SCHEMA}.lessons WHERE id = %s", (lid,))
    conn.commit()
    return ok({'ok': True})


def list_missions(cur):
    cur.execute(
        f"""SELECT id, title, product, format, goal, hooks, template, xp_reward,
                   days_available, unlock_after_lessons, sort_order
            FROM {SCHEMA}.missions ORDER BY sort_order, id"""
    )
    cols = ['id', 'title', 'product', 'format', 'goal', 'hooks', 'template', 'xp_reward',
            'days_available', 'unlock_after_lessons', 'sort_order']
    return ok({'missions': [dict(zip(cols, r)) for r in cur.fetchall()]})


def save_mission(cur, conn, body):
    hooks = json.dumps(body.get('hooks', []))
    if body.get('id'):
        cur.execute(
            f"""UPDATE {SCHEMA}.missions SET title=%s, product=%s, format=%s, goal=%s,
                hooks=%s, template=%s, xp_reward=%s, days_available=%s,
                unlock_after_lessons=%s, sort_order=%s WHERE id=%s""",
            (body.get('title', ''), body.get('product', ''), body.get('format', ''),
             body.get('goal', ''), hooks, body.get('template', ''),
             int(body.get('xp_reward', 500)), int(body.get('days_available', 30)),
             int(body.get('unlock_after_lessons', 0)), int(body.get('sort_order', 0)), body['id'])
        )
    else:
        cur.execute(
            f"""INSERT INTO {SCHEMA}.missions (title, product, format, goal, hooks, template,
                xp_reward, days_available, unlock_after_lessons, sort_order)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (body.get('title', ''), body.get('product', ''), body.get('format', ''),
             body.get('goal', ''), hooks, body.get('template', ''),
             int(body.get('xp_reward', 500)), int(body.get('days_available', 30)),
             int(body.get('unlock_after_lessons', 0)), int(body.get('sort_order', 0)))
        )
    conn.commit()
    return ok({'ok': True})


def delete_mission(cur, conn, body):
    mid = body.get('id')
    if not mid:
        return err('Нет id')
    cur.execute(f"DELETE FROM {SCHEMA}.user_missions WHERE mission_id = %s", (mid,))
    cur.execute(f"DELETE FROM {SCHEMA}.missions WHERE id = %s", (mid,))
    conn.commit()
    return ok({'ok': True})