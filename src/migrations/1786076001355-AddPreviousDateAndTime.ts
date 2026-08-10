import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreviousDateAndTime1786076001355 implements MigrationInterface {
    name = 'AddPreviousDateAndTime1786076001355'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" ADD "wasAutoReschduled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "previousDate" date`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "previousStartTime" TIME`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "previousEndTime" TIME`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "previousEndTime"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "previousStartTime"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "previousDate"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "wasAutoReschduled"`);
    }

}
