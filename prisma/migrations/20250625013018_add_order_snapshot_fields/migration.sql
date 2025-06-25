-- AlterTable
ALTER TABLE `DetailPesanan` ADD COLUMN `gambarProdukSnapshot` VARCHAR(191) NULL,
    ADD COLUMN `hargaTotalPOSnapshot` INTEGER NULL,
    ADD COLUMN `namaProdukSnapshot` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `tipeProdukSnapshot` ENUM('TUNGGAL', 'VARIAN', 'PO_LANGSUNG', 'PO_DP') NOT NULL DEFAULT 'TUNGGAL';
