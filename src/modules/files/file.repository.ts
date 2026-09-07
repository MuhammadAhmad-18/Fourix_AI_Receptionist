// ONLY file in the files module allowed to import PrismaClient.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const fileRepository = {
  findById(clinicId: string, id: string) {
    return prisma.file.findFirst({ where: { id, clinicId } });
  },
  create(data: Prisma.FileUncheckedCreateInput) {
    return prisma.file.create({ data });
  },
};
