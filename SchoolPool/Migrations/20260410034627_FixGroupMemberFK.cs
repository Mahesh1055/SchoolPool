using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPool.Migrations
{
    /// <inheritdoc />
    public partial class FixGroupMemberFK : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GroupMembers_CarpoolGroups_CarpoolGroupGroupId",
                table: "GroupMembers");

            migrationBuilder.DropIndex(
                name: "IX_GroupMembers_CarpoolGroupGroupId",
                table: "GroupMembers");

            migrationBuilder.DropColumn(
                name: "CarpoolGroupGroupId",
                table: "GroupMembers");

            migrationBuilder.AddForeignKey(
                name: "FK_GroupMembers_CarpoolGroups_GroupId",
                table: "GroupMembers",
                column: "GroupId",
                principalTable: "CarpoolGroups",
                principalColumn: "GroupId",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GroupMembers_CarpoolGroups_GroupId",
                table: "GroupMembers");

            migrationBuilder.AddColumn<int>(
                name: "CarpoolGroupGroupId",
                table: "GroupMembers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_GroupMembers_CarpoolGroupGroupId",
                table: "GroupMembers",
                column: "CarpoolGroupGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_GroupMembers_CarpoolGroups_CarpoolGroupGroupId",
                table: "GroupMembers",
                column: "CarpoolGroupGroupId",
                principalTable: "CarpoolGroups",
                principalColumn: "GroupId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
