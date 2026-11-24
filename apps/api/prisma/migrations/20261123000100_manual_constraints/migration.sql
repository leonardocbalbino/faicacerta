-- =============================================================================
-- Recursos do banco que o Prisma não expressa no schema.
-- As colunas estão em camelCase (padrão do Prisma), por isso as aspas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Busca sem acento e tolerante a erro de digitação (pg_trgm + unaccent)
-- -----------------------------------------------------------------------------
-- `unaccent` não é IMMUTABLE e por isso não pode ir direto num índice.
-- O wrapper fixa o dicionário e permite indexar. As consultas da API PRECISAM
-- usar exatamente a mesma expressão para o índice ser aproveitado:
--   f_unaccent(lower("japaneseName" || ' ' || "translation")) % f_unaccent(lower($1))
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX "techniques_search_trgm_idx" ON "techniques"
  USING gin (f_unaccent(lower("japaneseName" || ' ' || "translation")) gin_trgm_ops);

CREATE INDEX "glossary_terms_search_trgm_idx" ON "glossary_terms"
  USING gin (f_unaccent(lower("japanese" || ' ' || "translation")) gin_trgm_ops);

CREATE INDEX "articles_search_trgm_idx" ON "articles"
  USING gin (f_unaccent(lower("title")) gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Índices únicos parciais
-- -----------------------------------------------------------------------------
-- No máximo uma assinatura "viva" por usuário.
CREATE UNIQUE INDEX "subscriptions_one_live_per_user_idx" ON "subscriptions" ("userId")
  WHERE "status" IN ('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED');

-- No máximo um gateway de pagamento ativo.
CREATE UNIQUE INDEX "payment_gateway_single_active_idx" ON "payment_gateway_configs" ("isActive")
  WHERE "isActive";

-- Uma versão corrente por chave da configuração remota.
CREATE UNIQUE INDEX "remote_config_current_key_idx" ON "remote_config" ("key")
  WHERE "isCurrent";

-- Nome de programa único por dono (programas base têm ownerTeacherId nulo).
CREATE UNIQUE INDEX "programs_base_name_idx" ON "programs" ("name")
  WHERE "isBase" AND "deletedAt" IS NULL;

-- -----------------------------------------------------------------------------
-- CHECKs
-- -----------------------------------------------------------------------------
ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_one_target_chk"
  CHECK (num_nonnulls("techniqueId", "glossaryTermId") = 1);

ALTER TABLE "flashcard_reviews" ADD CONSTRAINT "flashcard_reviews_kind_matches_chk"
  CHECK (("kind" = 'TECHNIQUE' AND "techniqueId" IS NOT NULL)
      OR ("kind" = 'GLOSSARY' AND "glossaryTermId" IS NOT NULL));

ALTER TABLE "class_lesson_items" ADD CONSTRAINT "class_lesson_items_type_chk"
  CHECK (("type" = 'BASE_TECHNIQUE' AND "techniqueId" IS NOT NULL)
      OR ("type" = 'CUSTOM_CONTENT'));

ALTER TABLE "belts" ADD CONSTRAINT "belts_colors_chk"
  CHECK (cardinality("colors") BETWEEN 1 AND 2);

ALTER TABLE "classes" ADD CONSTRAINT "classes_invite_code_chk"
  CHECK ("inviteCode" ~ '^[A-Z0-9]{6}$');

-- Valores monetários.
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_amount_chk" CHECK ("amountCents" > 0);
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_period_chk"
  CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_amount_chk" CHECK ("amountCents" > 0);
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_period_chk" CHECK ("endsAt" > "startsAt");
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_discount_chk" CHECK (
  ("discountType" = 'PERCENT' AND "percentOff" BETWEEN 1 AND 100 AND "amountOffCents" IS NULL)
  OR ("discountType" = 'FIXED' AND "amountOffCents" > 0 AND "percentOff" IS NULL)
);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amounts_chk" CHECK (
  "amountCents" >= 0 AND "discountCents" >= 0 AND "amountCents" = "originalAmountCents" - "discountCents"
);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_price_chk" CHECK ("lockedPriceCents" > 0);

-- Lojinha.
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_price_chk" CHECK ("priceCents" > 0);
ALTER TABLE "store_product_variants" ADD CONSTRAINT "store_product_variants_chk"
  CHECK (("priceCents" IS NULL OR "priceCents" > 0) AND ("stock" IS NULL OR "stock" >= 0));
ALTER TABLE "store_orders" ADD CONSTRAINT "store_orders_total_chk" CHECK ("totalCents" > 0);
ALTER TABLE "store_order_items" ADD CONSTRAINT "store_order_items_chk" CHECK (
  "quantity" > 0 AND "unitPriceCents" > 0 AND "totalCents" = "unitPriceCents" * "quantity"
);
-- Limites do BR Code Pix (EMV): nome até 25 e cidade até 15 caracteres.
ALTER TABLE "teacher_stores" ADD CONSTRAINT "teacher_stores_pix_lengths_chk"
  CHECK (char_length("receiverName") BETWEEN 1 AND 25 AND char_length("receiverCity") BETWEEN 1 AND 15);
