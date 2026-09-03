"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("🌱 Seeding database...");
    // Clear existing data
    await prisma.url.deleteMany();
    // Create sample data
    const url1 = await prisma.url.create({
        data: {
            shortCode: "demo01",
            originalUrl: "https://www.github.com",
            customAlias: "github",
            title: "GitHub",
            description: "GitHub - Where the world builds software",
            clicks: 42,
        },
    });
    const url2 = await prisma.url.create({
        data: {
            shortCode: "demo02",
            originalUrl: "https://www.prisma.io",
            customAlias: "prisma",
            title: "Prisma",
            description: "Prisma - Next-generation ORM",
            clicks: 28,
        },
    });
    console.log("✅ Seeding completed");
    console.log({ url1, url2 });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
