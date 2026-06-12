"""MISSION platform API: уроки, миссии, портфолио, партнёрские ссылки."""
import json
import os
import psycopg2
from datetime import datetime

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p62618369_ai_ugc_gaming_servic')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def get_user(cur, token):
    if not token:
        return None
    cur.execute(
        f"""SELECT u.id, u.username, u.avatar, u.xp, u.level, u.streak,
                   u.platform, u.season_day, u.onboarded, u.bio_link, u.email
            FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    token = event.get('headers', {}).get('X-Session-Token', '')
    action = body.get('action', '') if method == 'POST' else (event.get('queryStringParameters') or {}).get('action', '')

    conn = get_conn()
    cur = conn.cursor()
    user_row = get_user(cur, token)
    user_id = user_row[0] if user_row else None

    try:
        if action == 'get_lessons' or (method == 'GET' and not action):
            return get_lessons(cur, user_id)
        if action == 'complete_lesson':
            if not user_id:
                return err('Не авторизован', 401)
            return complete_lesson(cur, conn, user_id, body.get('lesson_id'))
        if action == 'get_missions':
            return get_missions(cur, user_id)
        if action == 'start_mission':
            if not user_id:
                return err('Не авторизован', 401)
            return start_mission(cur, conn, user_id, body.get('mission_id'))
        if action == 'complete_mission':
            if not user_id:
                return err('Не авторизован', 401)
            return complete_mission(cur, conn, user_id, body.get('mission_id'))
        if action == 'get_portfolio':
            return get_portfolio(cur, user_id)
        if action == 'add_post':
            if not user_id:
                return err('Не авторизован', 401)
            return add_post(cur, conn, user_id, body)
        if action == 'get_partner_links':
            if not user_id:
                return err('Не авторизован', 401)
            return get_partner_links(cur, user_id)
        if action == 'update_profile':
            if not user_id:
                return err('Не авторизован', 401)
            return update_profile(cur, conn, user_id, body)
        if action == 'get_profile':
            return get_profile(cur, user_id)
        return err('Unknown action', 404)
    finally:
        conn.close()


def get_lessons(cur, user_id):
    cur.execute(f"""
        SELECT l.id, l.day_number, l.title, l.subtitle, l.duration_min,
               l.phase, l.checklist,
               CASE WHEN ul.id IS NOT NULL THEN true ELSE false END as completed
        FROM {SCHEMA}.lessons l
        LEFT JOIN {SCHEMA}.user_lessons ul ON ul.lesson_id = l.id AND ul.user_id = %s
        ORDER BY l.sort_order
    """, (user_id,))
    rows = cur.fetchall()
    return ok({'lessons': [{
        'id': r[0], 'day': r[1], 'title': r[2], 'subtitle': r[3],
        'duration': r[4], 'phase': r[5],
        'checklist': r[6] if r[6] else [],
        'completed': r[7],
    } for r in rows]})


def complete_lesson(cur, conn, user_id, lesson_id):
    if not lesson_id:
        return err('lesson_id required')
    cur.execute(f"SELECT id FROM {SCHEMA}.user_lessons WHERE user_id = %s AND lesson_id = %s", (user_id, lesson_id))
    if cur.fetchone():
        return ok({'ok': True, 'already': True})
    cur.execute(f"INSERT INTO {SCHEMA}.user_lessons (user_id, lesson_id) VALUES (%s, %s)", (user_id, lesson_id))
    cur.execute(f"UPDATE {SCHEMA}.users SET xp = xp + 50 WHERE id = %s RETURNING xp", (user_id,))
    new_xp = cur.fetchone()[0]
    new_level = max(1, new_xp // 300)
    cur.execute(f"UPDATE {SCHEMA}.users SET level = %s WHERE id = %s", (new_level, user_id))
    conn.commit()
    return ok({'ok': True, 'xp_gained': 50, 'total_xp': new_xp, 'level': new_level})


def get_missions(cur, user_id):
    cur.execute(f"""
        SELECT m.id, m.title, m.product, m.format, m.goal,
               m.hooks, m.template, m.xp_reward, m.unlock_after_lessons,
               um.status,
               (SELECT COUNT(*) FROM {SCHEMA}.user_lessons ul2 WHERE ul2.user_id = %s) as lessons_done
        FROM {SCHEMA}.missions m
        LEFT JOIN {SCHEMA}.user_missions um ON um.mission_id = m.id AND um.user_id = %s
        ORDER BY m.sort_order
    """, (user_id, user_id))
    rows = cur.fetchall()
    return ok({'missions': [{
        'id': r[0], 'title': r[1], 'product': r[2], 'format': r[3],
        'goal': r[4], 'hooks': r[5] if r[5] else [],
        'template': r[6], 'xp': r[7],
        'unlock_after': r[8], 'status': r[9],
        'unlocked': (r[10] or 0) >= r[8],
    } for r in rows]})


def start_mission(cur, conn, user_id, mission_id):
    if not mission_id:
        return err('mission_id required')
    cur.execute(
        f"INSERT INTO {SCHEMA}.user_missions (user_id, mission_id, status) VALUES (%s, %s, 'active') ON CONFLICT DO NOTHING",
        (user_id, mission_id)
    )
    conn.commit()
    return ok({'ok': True})


def complete_mission(cur, conn, user_id, mission_id):
    if not mission_id:
        return err('mission_id required')
    cur.execute(f"SELECT xp_reward FROM {SCHEMA}.missions WHERE id = %s", (mission_id,))
    m = cur.fetchone()
    if not m:
        return err('Миссия не найдена', 404)
    cur.execute(
        f"UPDATE {SCHEMA}.user_missions SET status = 'done', completed_at = NOW() WHERE user_id = %s AND mission_id = %s",
        (user_id, mission_id)
    )
    cur.execute(f"UPDATE {SCHEMA}.users SET xp = xp + %s WHERE id = %s RETURNING xp", (m[0], user_id))
    new_xp = cur.fetchone()[0]
    new_level = max(1, new_xp // 300)
    cur.execute(f"UPDATE {SCHEMA}.users SET level = %s WHERE id = %s", (new_level, user_id))
    conn.commit()
    return ok({'ok': True, 'xp_gained': m[0], 'total_xp': new_xp})


def get_portfolio(cur, user_id):
    cur.execute(f"""
        SELECT p.id, p.user_id, u.username,
               p.mission_id, m.title as mission_title,
               p.post_url, p.platform, p.format, p.notes,
               p.views, p.likes, p.published_at
        FROM {SCHEMA}.portfolio_posts p
        JOIN {SCHEMA}.users u ON p.user_id = u.id
        LEFT JOIN {SCHEMA}.missions m ON p.mission_id = m.id
        ORDER BY p.published_at DESC
        LIMIT 30
    """)
    rows = cur.fetchall()
    return ok({'posts': [{
        'id': r[0], 'user_id': r[1], 'username': r[2],
        'mission_id': r[3], 'mission': r[4],
        'url': r[5], 'platform': r[6], 'format': r[7], 'notes': r[8],
        'views': r[9], 'likes': r[10], 'published_at': str(r[11]),
        'is_mine': r[1] == user_id,
    } for r in rows]})


def add_post(cur, conn, user_id, body):
    url = (body.get('post_url') or '').strip()
    platform = (body.get('platform') or 'instagram').strip()
    fmt = (body.get('format') or 'post').strip()
    notes = (body.get('notes') or '').strip()
    mission_id = body.get('mission_id')
    if not url:
        return err('Ссылка на пост обязательна')
    cur.execute(
        f"INSERT INTO {SCHEMA}.portfolio_posts (user_id, mission_id, post_url, platform, format, notes) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
        (user_id, mission_id or None, url, platform, fmt, notes)
    )
    post_id = cur.fetchone()[0]
    cur.execute(f"UPDATE {SCHEMA}.users SET xp = xp + 100 WHERE id = %s RETURNING xp", (user_id,))
    new_xp = cur.fetchone()[0]
    conn.commit()
    return ok({'ok': True, 'post_id': post_id, 'xp_gained': 100, 'total_xp': new_xp})


def get_partner_links(cur, user_id):
    cur.execute(
        f"SELECT id, product, link, clicks, conversions FROM {SCHEMA}.partner_links WHERE user_id = %s ORDER BY id",
        (user_id,)
    )
    rows = cur.fetchall()
    return ok({'links': [{'id': r[0], 'product': r[1], 'link': r[2], 'clicks': r[3], 'conversions': r[4]} for r in rows]})


def update_profile(cur, conn, user_id, body):
    platform = body.get('platform', 'instagram')
    show_face = body.get('show_face', True)
    bio_link = body.get('bio_link', '')
    onboarded = body.get('onboarded', False)
    cur.execute(
        f"UPDATE {SCHEMA}.users SET platform = %s, show_face = %s, bio_link = %s, onboarded = %s WHERE id = %s",
        (platform, show_face, bio_link, onboarded, user_id)
    )
    conn.commit()
    return ok({'ok': True})


def get_profile(cur, user_id):
    if not user_id:
        return err('Не авторизован', 401)
    cur.execute(
        f"""SELECT id, username, email, avatar, xp, level, streak,
                   platform, season_day, onboarded, bio_link,
                   (SELECT COUNT(*) FROM {SCHEMA}.user_lessons WHERE user_id = %s) as lessons_done,
                   (SELECT COUNT(*) FROM {SCHEMA}.user_missions WHERE user_id = %s AND status = 'done') as missions_done,
                   (SELECT COUNT(*) FROM {SCHEMA}.portfolio_posts WHERE user_id = %s) as posts_count
            FROM {SCHEMA}.users WHERE id = %s""",
        (user_id, user_id, user_id, user_id)
    )
    r = cur.fetchone()
    if not r:
        return err('Не найден', 404)
    return ok({'profile': {
        'id': r[0], 'username': r[1], 'email': r[2], 'avatar': r[3],
        'xp': r[4], 'level': r[5], 'streak': r[6],
        'platform': r[7], 'season_day': r[8], 'onboarded': r[9], 'bio_link': r[10],
        'lessons_done': r[11], 'missions_done': r[12], 'posts_count': r[13],
    }})
