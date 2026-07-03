import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AssignFeeItemDto } from "./dto/assign-fee-item.dto";
import { CollectPaymentDto } from "./dto/collect-payment.dto";
import { CreateFeeItemDto } from "./dto/create-fee-item.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("establishments/:establishmentId/payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("overview")
  overview(
    @Param("establishmentId") establishmentId: string,
    @Query("academicYearId") academicYearId?: string
  ) {
    return this.paymentsService.overview(establishmentId, academicYearId);
  }

  @Post("fee-items")
  createFeeItem(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CreateFeeItemDto
  ) {
    return this.paymentsService.createFeeItem(establishmentId, dto);
  }

  @Post("fee-items/:feeItemId/assign")
  assignFeeItem(
    @Param("establishmentId") establishmentId: string,
    @Param("feeItemId") feeItemId: string,
    @Body() dto: AssignFeeItemDto
  ) {
    return this.paymentsService.assignFeeItem(establishmentId, feeItemId, dto);
  }

  @Post("collect")
  collect(
    @Param("establishmentId") establishmentId: string,
    @Body() dto: CollectPaymentDto
  ) {
    return this.paymentsService.collect(establishmentId, dto);
  }
}
