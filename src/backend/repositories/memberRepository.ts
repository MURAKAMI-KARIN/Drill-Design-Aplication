import { prisma } from "../db/prisma";

export const memberRepository = {
  async findAll() {
    return prisma.member.findMany({
      orderBy: { name: "asc" },
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
    return prisma.member.delete({
      where: { id },
    });
  },

  async update(id: number, data: { name?: string; instrument?: string; color?: string }) {
    return prisma.member.update({
      where: { id },
      data,
    });
  },
};
