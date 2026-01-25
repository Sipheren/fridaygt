-- Create atomic race reorder function to prevent race conditions
-- This function performs all race order updates in a single transaction

CREATE OR REPLACE FUNCTION reorder_races_atomic(race_ids text[], new_order int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    race_index int;
BEGIN
    -- Validate input arrays
    IF array_length(race_ids, 1) IS NULL OR array_length(new_order, 1) IS NULL THEN
        RAISE EXCEPTION 'Input arrays cannot be null';
    END IF;

    IF array_length(race_ids, 1) != array_length(new_order, 1) THEN
        RAISE EXCEPTION 'Race IDs and order arrays must have the same length';
    END IF;

    -- Lock all races to prevent concurrent updates
    -- This prevents other transactions from modifying these rows
    PERFORM id FROM "Race"
    WHERE id = ANY(race_ids)
    FOR UPDATE;

    -- Update each race with its new order
    FOR race_index IN array_lower(race_ids, 1)..array_upper(race_ids, 1) LOOP
        UPDATE "Race"
        SET "order" = new_order[race_index],
            "updatedAt" = NOW()
        WHERE id = race_ids[race_index];

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Race with ID % not found', race_ids[race_index];
        END IF;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reorder_races_atomic(text[], int[]) TO authenticated;
GRANT EXECUTE ON FUNCTION reorder_races_atomic(text[], int[]) TO service_role;
