/*
  Warnings:

  - A unique constraint covering the columns `[idProduk]` on the table `Produk` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idProduk` to the `Produk` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Produk` ADD COLUMN `idProduk` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Produk_idProduk_key` ON `Produk`(`idProduk`);
