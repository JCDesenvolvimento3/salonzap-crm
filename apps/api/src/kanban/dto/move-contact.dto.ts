import { IsString } from 'class-validator';

export class MoveContactDto {
  @IsString()
  contactId!: string;

  @IsString()
  targetStageId!: string;
}
