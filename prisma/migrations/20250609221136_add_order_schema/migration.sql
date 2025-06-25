-- CreateTable
CREATE TABLE `Pesanan` (
    `id` VARCHAR(191) NOT NULL,
    `idPesanan` VARCHAR(191) NOT NULL,
    `namaPemesan` VARCHAR(191) NOT NULL,
    `alamatPemesan` TEXT NOT NULL,
    `teleponPemesan` VARCHAR(191) NOT NULL,
    `totalHarga` INTEGER NOT NULL,
    `statusPembayaran` VARCHAR(191) NOT NULL,
    `statusPesanan` VARCHAR(191) NOT NULL,
    `statusPacking` VARCHAR(191) NOT NULL DEFAULT 'Belum Dikemas',
    `jumlahDp` INTEGER NULL,
    `waktuDp` DATETIME(3) NULL,
    `jumlahPelunasan` INTEGER NULL,
    `waktuPelunasan` DATETIME(3) NULL,
    `waktuDiterima` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pesanan_idPesanan_key`(`idPesanan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetailPesanan` (
    `id` VARCHAR(191) NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `harga` INTEGER NOT NULL,
    `pesananId` VARCHAR(191) NOT NULL,
    `produkId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
