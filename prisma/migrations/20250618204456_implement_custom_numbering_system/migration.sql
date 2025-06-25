/*
  Warnings:

  - A unique constraint covering the columns `[nomorUrutPrefix,nomorUrutAngka]` on the table `Pesanan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Pesanan` ADD COLUMN `nomorUrutAngka` INTEGER NULL,
    ADD COLUMN `nomorUrutPrefix` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `NomorUrutCounter` (
    `prefix` VARCHAR(191) NOT NULL,
    `lastNumber` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`prefix`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Pesanan_nomorUrutPrefix_nomorUrutAngka_key` ON `Pesanan`(`nomorUrutPrefix`, `nomorUrutAngka`);
