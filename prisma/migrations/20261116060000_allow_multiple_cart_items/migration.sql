-- A cart can contain multiple products; the compound index prevents duplicates.
DROP INDEX IF EXISTS "CartItem_cartId_key";
