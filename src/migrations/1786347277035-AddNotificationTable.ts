import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationTable1786347277035 implements MigrationInterface {
    name = 'AddNotificationTable1786347277035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('appointment_booked', 'appointment_cancelled', 'appointment_rescheduled')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."notifications_type_enum" NOT NULL, "referenceDate" date NOT NULL, "referenceStartTime" TIME NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "patientId" uuid, "appointmentId" uuid, CONSTRAINT "UQ_70eb0eecada6daee15376396824" UNIQUE ("appointmentId", "type", "referenceDate", "referenceStartTime"), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_f04ea6f5b506c1b24903ed4c965" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_a1a62bb5c29d64d2817bb9f7898" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_a1a62bb5c29d64d2817bb9f7898"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_f04ea6f5b506c1b24903ed4c965"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
