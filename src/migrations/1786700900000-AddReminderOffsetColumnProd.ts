import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReminderOffsetColumnProd1786700900000 implements MigrationInterface {
    name = 'AddReminderOffsetColumnProd1786700900000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "reminderOffsetMinutes" integer`);

        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'appointment_reminder'`);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'UQ_70eb0eecada6daee15376396824'
                ) THEN
                    ALTER TABLE "notifications" DROP CONSTRAINT "UQ_70eb0eecada6daee15376396824";
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD CONSTRAINT "UQ_notifications_reminder_dedup"
            UNIQUE ("appointmentId", "type", "referenceDate", "referenceStartTime", "reminderOffsetMinutes")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "UQ_notifications_reminder_dedup"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "reminderOffsetMinutes"`);
    }
}