import { Module } from "@nestjs/common";
import { CirclePreviewController, CirclesController } from "./circles.controller";
import { CirclesService } from "./circles.service";

@Module({
  controllers: [CirclesController, CirclePreviewController],
  providers: [CirclesService],
  exports: [CirclesService],
})
export class CirclesModule {}
