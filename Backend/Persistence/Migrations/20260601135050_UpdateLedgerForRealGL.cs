using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corevix.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateLedgerForRealGL : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "AccountId",
                table: "LedgerEntries",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "GlAccountCode",
                table: "LedgerEntries",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GlAccountName",
                table: "LedgerEntries",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GlAccountCode",
                table: "LedgerEntries");

            migrationBuilder.DropColumn(
                name: "GlAccountName",
                table: "LedgerEntries");

            migrationBuilder.AlterColumn<Guid>(
                name: "AccountId",
                table: "LedgerEntries",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
