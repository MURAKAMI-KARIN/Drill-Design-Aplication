import { prisma } from "../db/prisma";

export const memberRepository = {
  async findAll() {
    return prisma.member.findMany({
      orderBy: { id: "asc" },
    });
  },

  async create(name: string, instrument: string, color: string = "#3B82F6") {
    return prisma.member.create({
      data: {
        name,
        instrument,
        color,
      },
    });
  },

  async delete(id: number) {
    await prisma.position.deleteMany({
      where: { memberId: id },
    });
    try {
      return await prisma.member.delete({
        where: { id },
      });
    } catch (e) {
      return null;
    }
  },

  async deleteAll() {
    await prisma.position.deleteMany({});
    return prisma.member.deleteMany({});
  },

  async update(id: number, data: { name?: string; instrument?: string; color?: string }) {
    return prisma.member.update({
      where: { id },
      data,
    });
  },
};
