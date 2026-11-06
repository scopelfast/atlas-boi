import { Module } from "@nestjs/common";
import { IntelligenceController } from "./intelligence.controller";
import { IntelligenceService } from "./intelligence.service";
import { OpsBrainService } from "./ops-brain.service";
import { QueryBrainService } from "./query-brain.service";
import { NfeBrainService } from "./nfe-brain.service";
import { QueryLlmService } from "./query-llm.service";
import { ComprovanteBrainService } from "./comprovante-brain.service";
import { RotaBrainService } from "./rota-brain.service";

@Module({
  controllers: [IntelligenceController],
  providers: [
    IntelligenceService,
    OpsBrainService,
    QueryBrainService,
    NfeBrainService,
    QueryLlmService,
    ComprovanteBrainService,
    RotaBrainService,
  ],
  exports: [NfeBrainService, IntelligenceService, ComprovanteBrainService, RotaBrainService],
})
export class IntelligenceModule {}
