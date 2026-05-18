using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPool.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GroupName",
                table: "CarpoolGroups",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GroupName",
                table: "CarpoolGroups");
        }
    }
}
