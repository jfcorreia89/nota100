-- Seed: march 2026 tests
-- Inserts tests for various disciplines across the rest of March 2026
-- Uses the first available class and student; safe to run multiple times (ON CONFLICT DO NOTHING via unique topic+date+class check)

DO $$
DECLARE
  v_class_id uuid;
  v_user_id  uuid;
BEGIN
  SELECT id INTO v_class_id FROM classes ORDER BY created_at LIMIT 1;
  SELECT id INTO v_user_id  FROM profiles WHERE role = 'student' ORDER BY created_at LIMIT 1;

  IF v_class_id IS NULL OR v_user_id IS NULL THEN
    RAISE NOTICE 'Seed skipped: no class or student found.';
    RETURN;
  END IF;

  INSERT INTO tests (class_id, subject, topic, test_date, created_by) VALUES
    (v_class_id, 'Matemática',           'Funções e Derivadas',                  '2026-03-24', v_user_id),
    (v_class_id, 'Português',            'Texto Narrativo e Poesia',             '2026-03-25', v_user_id),
    (v_class_id, 'Física e Química A',   'Cinemática — MRU e MRUA',              '2026-03-26', v_user_id),
    (v_class_id, 'História A',           'Primeira Guerra Mundial',              '2026-03-27', v_user_id),
    (v_class_id, 'Biologia e Geologia',  'Genética Mendeliana',                  '2026-03-28', v_user_id),
    (v_class_id, 'Inglês',               'Reading Comprehension & Writing',      '2026-03-30', v_user_id),
    (v_class_id, 'Filosofia',            'Argumentação e Lógica Formal',         '2026-03-31', v_user_id);

  RAISE NOTICE 'Seeded 7 March tests for class %', v_class_id;
END $$;
