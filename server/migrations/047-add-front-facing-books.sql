BEGIN;

ALTER TABLE shelf_items DROP CONSTRAINT IF EXISTS shelf_items_pose_check;
ALTER TABLE shelf_items ADD CONSTRAINT shelf_items_pose_check
    CHECK (pose IN ('upright', 'lean', 'flat', 'front'));

COMMIT;
