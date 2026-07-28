import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSchedulingTypeAndSlotDurationColumn1785040761546 implements MigrationInterface {
    name = 'AddSchedulingTypeAndSlotDurationColumn1785040761546'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."doctors_schedulingtype_enum" AS ENUM('stream', 'wave')`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "schedulingType" "public"."doctors_schedulingtype_enum"`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "slotDuration" integer`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "bufferTime" integer`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "maxAppointments" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "maxAppointments"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "bufferTime"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "slotDuration"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "schedulingType"`);
        await queryRunner.query(`DROP TYPE "public"."doctors_schedulingtype_enum"`);
    }

}
