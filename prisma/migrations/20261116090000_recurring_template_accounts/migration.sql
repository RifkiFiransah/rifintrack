-- Recurring rules need a transaction template (account/category) so due
-- occurrences can be posted without asking the user again.

ALTER TABLE "recurring_rules"
  ADD COLUMN "account_id" UUID,
  ADD COLUMN "category_id" UUID,
  ADD COLUMN "source_account_id" UUID,
  ADD COLUMN "destination_account_id" UUID;

CREATE INDEX "recurring_rules_account_id_idx" ON "recurring_rules"("account_id");
CREATE INDEX "recurring_rules_category_id_idx" ON "recurring_rules"("category_id");
CREATE INDEX "recurring_rules_source_account_id_idx" ON "recurring_rules"("source_account_id");
CREATE INDEX "recurring_rules_destination_account_id_idx" ON "recurring_rules"("destination_account_id");

ALTER TABLE "recurring_rules"
  ADD CONSTRAINT "recurring_rules_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_rules"
  ADD CONSTRAINT "recurring_rules_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_rules"
  ADD CONSTRAINT "recurring_rules_source_account_id_fkey"
  FOREIGN KEY ("source_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_rules"
  ADD CONSTRAINT "recurring_rules_destination_account_id_fkey"
  FOREIGN KEY ("destination_account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recurring_rules"
  ADD CONSTRAINT "chk_recurring_standard_account"
  CHECK (
    "type" = 'TRANSFER'
    OR ("account_id" IS NOT NULL AND "source_account_id" IS NULL AND "destination_account_id" IS NULL)
  );

ALTER TABLE "recurring_rules"
  ADD CONSTRAINT "chk_recurring_transfer_accounts"
  CHECK (
    "type" <> 'TRANSFER'
    OR (
      "account_id" IS NULL
      AND "source_account_id" IS NOT NULL
      AND "destination_account_id" IS NOT NULL
      AND "source_account_id" <> "destination_account_id"
    )
  );
