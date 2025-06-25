/*
  Warnings:

  - Added the required column `jumlah` to the `TransaksiPembayaran` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `TransaksiPembayaran` ADD COLUMN `jumlah` INTEGER NOT NULL;
