using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPool.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupMemberChildCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ChildCount",
                table: "GroupMembers",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChildCount",
                table: "GroupMembers");
        }
    }
}
