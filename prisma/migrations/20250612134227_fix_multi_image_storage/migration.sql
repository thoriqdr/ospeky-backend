/*
  Warnings:

  - You are about to drop the column `gambarUrl` on the `Produk` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Produk` DROP COLUMN `gambarUrl`,
    ADD COLUMN `gambarUrls` TEXT NULL;
