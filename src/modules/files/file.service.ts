import { ActorContext } from "@/lib/auth/types";
import { AppError, ErrorCode } from "@/lib/errors/codes";
import { getFileStorageProvider, sniffMimeType } from "@/lib/storage/file-storage";
import { fileRepository } from "@/modules/files/file.repository";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const fileService = {
  async uploadFile(
    ctx: ActorContext,
    input: { buffer: Buffer; originalName: string; patientId?: string; treatmentId?: string; isPublic?: boolean },
  ) {
    if (input.buffer.byteLength > MAX_SIZE_BYTES) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "File exceeds maximum allowed size (20MB)");
    }
    const mimeType = sniffMimeType(input.buffer);
    if (!mimeType) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Unsupported or unrecognized file type");
    }

    const provider = getFileStorageProvider();
    const stored = await provider.upload(ctx.clinicId, input.buffer, input.originalName);

    return fileRepository.create({
      clinicId: ctx.clinicId,
      patientId: input.patientId ?? null,
      treatmentId: input.treatmentId ?? null,
      storageKey: stored.storageKey,
      provider: stored.provider,
      mimeType,
      sizeBytes: input.buffer.byteLength,
      originalName: input.originalName,
      isPublic: input.isPublic ?? false,
    });
  },

  async getFileContent(ctx: ActorContext, fileId: string) {
    const file = await fileRepository.findById(ctx.clinicId, fileId);
    if (!file) throw new AppError(ErrorCode.NOT_FOUND, `File ${fileId} not found`);
    const provider = getFileStorageProvider();
    const buffer = await provider.read(file.storageKey);
    return { file, buffer };
  },
};
