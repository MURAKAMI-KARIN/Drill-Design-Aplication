import { positionRepository } from "../repositories/positionRepository";

export const positionService = {
  async getPositions(setId: number) {
    return positionRepository.findBySetId(setId);
  },

  async upsertPosition(memberId: number, setId: number, x: number, y: number) {
    return positionRepository.upsert(memberId, setId, x, y);
  },

  async updatePosition(id: number, x?: number, y?: number) {
    return positionRepository.update(id, { x, y });
  },
};
