import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ContactsModule } from './contacts/contacts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { KanbanModule } from './kanban/kanban.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuickRepliesModule } from './quick-replies/quick-replies.module';
import { RemindersModule } from './reminders/reminders.module';
import { SettingsModule } from './settings/settings.module';
import { TagsModule } from './tags/tags.module';

const envFileCandidates = [
  join(process.cwd(), '.env'),
  join(process.cwd(), '..', '..', '.env'),
  join(__dirname, '..', '.env'),
  join(__dirname, '..', '..', '..', '.env'),
].filter(
  (value, index, array) => array.indexOf(value) === index && existsSync(value),
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFileCandidates.length ? envFileCandidates : undefined,
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    ContactsModule,
    TagsModule,
    NotesModule,
    QuickRepliesModule,
    RemindersModule,
    KanbanModule,
    CampaignsModule,
    SettingsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
