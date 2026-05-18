using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SchoolPool.Migrations
{
    /// <inheritdoc />
    public partial class AddSeatBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeatBookings",
                columns: table => new
                {
                    SeatBookingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GroupId = table.Column<int>(type: "int", nullable: false),
                    ParentId = table.Column<int>(type: "int", nullable: false),
                    ChildId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BookedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeatBookings", x => x.SeatBookingId);
                    table.ForeignKey(
                        name: "FK_SeatBookings_CarpoolGroups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "CarpoolGroups",
                        principalColumn: "GroupId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SeatBookings_Children_ChildId",
                        column: x => x.ChildId,
                        principalTable: "Children",
                        principalColumn: "ChildId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SeatBookings_Parents_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Parents",
                        principalColumn: "ParentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SeatBookings_ChildId",
                table: "SeatBookings",
                column: "ChildId");

            migrationBuilder.CreateIndex(
                name: "IX_SeatBookings_GroupId",
                table: "SeatBookings",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_SeatBookings_ParentId",
                table: "SeatBookings",
                column: "ParentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeatBookings");
        }
    }
}
