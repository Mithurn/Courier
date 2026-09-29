-- AlterTable
ALTER TABLE `ScheduledEmail` ADD COLUMN `archived` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `starred` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `trashed` BOOLEAN NOT NULL DEFAULT false;
