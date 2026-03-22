-- Performance: missing indexes for frequent query patterns and RLS policy evaluation
-- Each RLS policy that checks class membership does a lookup on class_members(user_id)
-- Without an index, every authenticated query scans the whole table.

-- class_members.user_id — every RLS policy runs EXISTS(SELECT 1 FROM class_members WHERE user_id = auth.uid())
CREATE INDEX IF NOT EXISTS idx_class_members_user_id ON class_members(user_id);

-- tests(class_id, test_date) — layout + dashboard: WHERE class_id = ? AND test_date >= ? ORDER BY test_date
CREATE INDEX IF NOT EXISTS idx_tests_class_date ON tests(class_id, test_date);

-- topic_predictions(test_id) — fetched per test on dashboard and test page
CREATE INDEX IF NOT EXISTS idx_topic_predictions_test_id ON topic_predictions(test_id);

-- topic_votes(prediction_id) — loaded as nested relation on topic_predictions
CREATE INDEX IF NOT EXISTS idx_topic_votes_prediction_id ON topic_votes(prediction_id);

-- uploads(test_id) — fetched per test on test page and quiz
CREATE INDEX IF NOT EXISTS idx_uploads_test_id ON uploads(test_id);

-- uploads: feed query orders by created_at; is_public filter uses idx_uploads_test_id above
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);

-- upload_reactions(upload_id) — loaded as nested relation on every upload fetch
CREATE INDEX IF NOT EXISTS idx_upload_reactions_upload_id ON upload_reactions(upload_id);

-- quiz_attempts(user_id, test_id) — loaded per user per test in quiz page
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_test ON quiz_attempts(user_id, test_id);
