-- MISSION platform schema

-- Learning Path: уроки
CREATE TABLE IF NOT EXISTS t_p62618369_ai_ugc_gaming_servic.lessons (
    id SERIAL PRIMARY KEY,
    day_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    duration_min INTEGER DEFAULT 10,
    phase VARCHAR(20) DEFAULT 'prep',  -- prep | publish | monetize
    checklist JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0
);

-- Прогресс пользователя по урокам
CREATE TABLE IF NOT EXISTS t_p62618369_ai_ugc_gaming_servic.user_lessons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.users(id),
    lesson_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.lessons(id),
    completed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- Missions / Quests
CREATE TABLE IF NOT EXISTS t_p62618369_ai_ugc_gaming_servic.missions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    product VARCHAR(100),
    format VARCHAR(200),
    goal TEXT,
    hooks JSONB DEFAULT '[]',
    template TEXT,
    xp_reward INTEGER DEFAULT 500,
    days_available INTEGER DEFAULT 30,
    unlock_after_lessons INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- Назначение миссии пользователю
CREATE TABLE IF NOT EXISTS t_p62618369_ai_ugc_gaming_servic.user_missions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.users(id),
    mission_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.missions(id),
    status VARCHAR(20) DEFAULT 'active',  -- active | done
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    UNIQUE(user_id, mission_id)
);

-- Публикации (Portfolio entries)
CREATE TABLE IF NOT EXISTS t_p62618369_ai_ugc_gaming_servic.portfolio_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.users(id),
    mission_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.missions(id),
    post_url TEXT,
    platform VARCHAR(30),  -- instagram | tiktok | telegram | youtube
    format VARCHAR(30),    -- reel | story | post | short
    notes TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    published_at TIMESTAMP DEFAULT NOW()
);

-- Partner links
CREATE TABLE IF NOT EXISTS t_p62618369_ai_ugc_gaming_servic.partner_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p62618369_ai_ugc_gaming_servic.users(id),
    product VARCHAR(100) NOT NULL,
    link TEXT NOT NULL,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Расширяем users: добавляем поля для MISSION
ALTER TABLE t_p62618369_ai_ugc_gaming_servic.users
    ADD COLUMN IF NOT EXISTS platform VARCHAR(30) DEFAULT 'instagram',
    ADD COLUMN IF NOT EXISTS show_face BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS season_day INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS bio_link TEXT,
    ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
