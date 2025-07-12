-- CreateTable
CREATE TABLE "Ad" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "image" INTEGER,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT 'inactive',
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "file_filesize" INTEGER,
    "file_filename" TEXT,
    "embedCode" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "image" INTEGER,
    "bio" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER DEFAULT 1,
    "section" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classify" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER DEFAULT 1,
    "category" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Classify_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT,
    "displayLocation" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "image" INTEGER,
    "link" TEXT NOT NULL DEFAULT '',
    "state" TEXT DEFAULT 'active',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "donationType" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "image" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'inactive',
    "donationUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationPV" (
    "id" SERIAL NOT NULL,
    "pageUrl" TEXT NOT NULL DEFAULT '',
    "clickTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "DonationPV_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "heroImage" INTEGER,
    "organizer" TEXT NOT NULL DEFAULT '',
    "contactInfo" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "fee" TEXT NOT NULL DEFAULT '',
    "registrationUrl" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" SERIAL NOT NULL,
    "member" INTEGER,
    "post" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepagePick" (
    "id" SERIAL NOT NULL,
    "category" INTEGER,
    "customUrl" TEXT NOT NULL DEFAULT '',
    "customImage" INTEGER,
    "customTitle" TEXT NOT NULL DEFAULT '',
    "customDescription" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "HomepagePick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoGraph" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "image" INTEGER,
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "InfoGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "jobDescription" TEXT NOT NULL DEFAULT '',
    "requirements" TEXT NOT NULL DEFAULT '',
    "salary" TEXT NOT NULL DEFAULT '',
    "bonus" TEXT NOT NULL DEFAULT '',
    "applicationMethod" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "showOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" SERIAL NOT NULL,
    "firebaseId" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "firstName" TEXT NOT NULL DEFAULT '',
    "avatar" INTEGER,
    "city" TEXT NOT NULL DEFAULT '',
    "birthDate" TIMESTAMP(3),
    "email" TEXT NOT NULL DEFAULT '',
    "state" TEXT DEFAULT 'active',
    "newsletterSubscription" TEXT DEFAULT 'none',
    "newsletterFrequency" TEXT DEFAULT 'weekday',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "heroImage" INTEGER,
    "sendDate" TIMESTAMP(3) NOT NULL,
    "showMenu" BOOLEAN NOT NULL DEFAULT false,
    "showReadingRank" BOOLEAN NOT NULL DEFAULT false,
    "poll" INTEGER,
    "readerResponseTitle" TEXT NOT NULL DEFAULT '',
    "readerResponseLink" TEXT NOT NULL DEFAULT '',
    "readerResponseText" TEXT NOT NULL DEFAULT '',
    "standardHtml" TEXT NOT NULL DEFAULT '',
    "beautifiedHtml" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "imageFile_filesize" INTEGER,
    "imageFile_extension" TEXT,
    "imageFile_width" INTEGER,
    "imageFile_height" INTEGER,
    "imageFile_id" TEXT,
    "file_filesize" INTEGER,
    "file_filename" TEXT,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "option1" TEXT NOT NULL DEFAULT '',
    "option1Image" INTEGER,
    "option2" TEXT NOT NULL DEFAULT '',
    "option2Image" INTEGER,
    "option3" TEXT NOT NULL DEFAULT '',
    "option3Image" INTEGER,
    "option4" TEXT NOT NULL DEFAULT '',
    "option4Image" INTEGER,
    "option5" TEXT NOT NULL DEFAULT '',
    "option5Image" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollResult" (
    "id" SERIAL NOT NULL,
    "poll" INTEGER,
    "member" INTEGER,
    "post" INTEGER,
    "result" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "PollResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "subtitle" TEXT,
    "state" TEXT DEFAULT 'draft',
    "publishTime" TIMESTAMP(3) NOT NULL,
    "ogImage" INTEGER,
    "author1" INTEGER,
    "author2" INTEGER,
    "author3" INTEGER,
    "otherByline" TEXT NOT NULL DEFAULT '',
    "section" INTEGER,
    "category" INTEGER,
    "classify" INTEGER,
    "topic" INTEGER,
    "style" TEXT DEFAULT 'default',
    "heroImage" INTEGER,
    "heroCaption" TEXT NOT NULL DEFAULT '',
    "content" JSONB,
    "citations" TEXT NOT NULL DEFAULT '',
    "ad1" INTEGER,
    "ad2" INTEGER,
    "rssTargets" JSONB NOT NULL DEFAULT '[]',
    "poll" INTEGER,
    "aiPollHelper" BOOLEAN NOT NULL DEFAULT false,
    "aiPollHelperResult" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingHistory" (
    "id" SERIAL NOT NULL,
    "member" INTEGER,
    "post" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "ReadingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "style" TEXT DEFAULT 'default',
    "showInHeader" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "brief" TEXT NOT NULL DEFAULT '',
    "heroImage" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timeline" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" TEXT NOT NULL DEFAULT 'asc',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "eventTime" TIMESTAMP(3) NOT NULL,
    "timeFormat" TEXT NOT NULL DEFAULT 'day',
    "content" TEXT NOT NULL DEFAULT '',
    "image" INTEGER,
    "imageCaption" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "content" TEXT NOT NULL DEFAULT '',
    "heroImage" INTEGER,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "file_filesize" INTEGER,
    "file_filename" TEXT,
    "coverPhoto" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Newsletter_ads" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Attachment_posts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Newsletter_events" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_HomepagePick_posts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_HomepagePick_topics" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_locations" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Member_interestedSections" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Newsletter_focusPosts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Newsletter_relatedPosts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Photo_posts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_tags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Post_relatedPosts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Tag_topics" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_Timeline_items" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE INDEX "Ad_image_idx" ON "Ad"("image");

-- CreateIndex
CREATE INDEX "Ad_createdBy_idx" ON "Ad"("createdBy");

-- CreateIndex
CREATE INDEX "Ad_updatedBy_idx" ON "Ad"("updatedBy");

-- CreateIndex
CREATE INDEX "Attachment_createdBy_idx" ON "Attachment"("createdBy");

-- CreateIndex
CREATE INDEX "Attachment_updatedBy_idx" ON "Attachment"("updatedBy");

-- CreateIndex
CREATE INDEX "Author_image_idx" ON "Author"("image");

-- CreateIndex
CREATE INDEX "Author_createdBy_idx" ON "Author"("createdBy");

-- CreateIndex
CREATE INDEX "Author_updatedBy_idx" ON "Author"("updatedBy");

-- CreateIndex
CREATE INDEX "Category_section_idx" ON "Category"("section");

-- CreateIndex
CREATE INDEX "Category_createdBy_idx" ON "Category"("createdBy");

-- CreateIndex
CREATE INDEX "Category_updatedBy_idx" ON "Category"("updatedBy");

-- CreateIndex
CREATE INDEX "Classify_category_idx" ON "Classify"("category");

-- CreateIndex
CREATE INDEX "Classify_createdBy_idx" ON "Classify"("createdBy");

-- CreateIndex
CREATE INDEX "Classify_updatedBy_idx" ON "Classify"("updatedBy");

-- CreateIndex
CREATE INDEX "Config_image_idx" ON "Config"("image");

-- CreateIndex
CREATE INDEX "Config_createdBy_idx" ON "Config"("createdBy");

-- CreateIndex
CREATE INDEX "Config_updatedBy_idx" ON "Config"("updatedBy");

-- CreateIndex
CREATE INDEX "Donation_image_idx" ON "Donation"("image");

-- CreateIndex
CREATE INDEX "Donation_createdBy_idx" ON "Donation"("createdBy");

-- CreateIndex
CREATE INDEX "Donation_updatedBy_idx" ON "Donation"("updatedBy");

-- CreateIndex
CREATE INDEX "DonationPV_createdBy_idx" ON "DonationPV"("createdBy");

-- CreateIndex
CREATE INDEX "DonationPV_updatedBy_idx" ON "DonationPV"("updatedBy");

-- CreateIndex
CREATE INDEX "Event_heroImage_idx" ON "Event"("heroImage");

-- CreateIndex
CREATE INDEX "Event_createdBy_idx" ON "Event"("createdBy");

-- CreateIndex
CREATE INDEX "Event_updatedBy_idx" ON "Event"("updatedBy");

-- CreateIndex
CREATE INDEX "Favorite_member_idx" ON "Favorite"("member");

-- CreateIndex
CREATE INDEX "Favorite_post_idx" ON "Favorite"("post");

-- CreateIndex
CREATE INDEX "Favorite_createdBy_idx" ON "Favorite"("createdBy");

-- CreateIndex
CREATE INDEX "Favorite_updatedBy_idx" ON "Favorite"("updatedBy");

-- CreateIndex
CREATE INDEX "HomepagePick_category_idx" ON "HomepagePick"("category");

-- CreateIndex
CREATE INDEX "HomepagePick_customImage_idx" ON "HomepagePick"("customImage");

-- CreateIndex
CREATE INDEX "HomepagePick_createdBy_idx" ON "HomepagePick"("createdBy");

-- CreateIndex
CREATE INDEX "HomepagePick_updatedBy_idx" ON "HomepagePick"("updatedBy");

-- CreateIndex
CREATE INDEX "InfoGraph_image_idx" ON "InfoGraph"("image");

-- CreateIndex
CREATE INDEX "InfoGraph_createdBy_idx" ON "InfoGraph"("createdBy");

-- CreateIndex
CREATE INDEX "InfoGraph_updatedBy_idx" ON "InfoGraph"("updatedBy");

-- CreateIndex
CREATE INDEX "Job_createdBy_idx" ON "Job"("createdBy");

-- CreateIndex
CREATE INDEX "Job_updatedBy_idx" ON "Job"("updatedBy");

-- CreateIndex
CREATE INDEX "Location_createdBy_idx" ON "Location"("createdBy");

-- CreateIndex
CREATE INDEX "Location_updatedBy_idx" ON "Location"("updatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Member_firebaseId_key" ON "Member"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- CreateIndex
CREATE INDEX "Member_avatar_idx" ON "Member"("avatar");

-- CreateIndex
CREATE INDEX "Member_createdBy_idx" ON "Member"("createdBy");

-- CreateIndex
CREATE INDEX "Member_updatedBy_idx" ON "Member"("updatedBy");

-- CreateIndex
CREATE INDEX "Newsletter_heroImage_idx" ON "Newsletter"("heroImage");

-- CreateIndex
CREATE INDEX "Newsletter_poll_idx" ON "Newsletter"("poll");

-- CreateIndex
CREATE INDEX "Newsletter_createdBy_idx" ON "Newsletter"("createdBy");

-- CreateIndex
CREATE INDEX "Newsletter_updatedBy_idx" ON "Newsletter"("updatedBy");

-- CreateIndex
CREATE INDEX "Photo_createdBy_idx" ON "Photo"("createdBy");

-- CreateIndex
CREATE INDEX "Photo_updatedBy_idx" ON "Photo"("updatedBy");

-- CreateIndex
CREATE INDEX "Poll_option1Image_idx" ON "Poll"("option1Image");

-- CreateIndex
CREATE INDEX "Poll_option2Image_idx" ON "Poll"("option2Image");

-- CreateIndex
CREATE INDEX "Poll_option3Image_idx" ON "Poll"("option3Image");

-- CreateIndex
CREATE INDEX "Poll_option4Image_idx" ON "Poll"("option4Image");

-- CreateIndex
CREATE INDEX "Poll_option5Image_idx" ON "Poll"("option5Image");

-- CreateIndex
CREATE INDEX "Poll_createdBy_idx" ON "Poll"("createdBy");

-- CreateIndex
CREATE INDEX "Poll_updatedBy_idx" ON "Poll"("updatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "PollResult_post_key" ON "PollResult"("post");

-- CreateIndex
CREATE INDEX "PollResult_poll_idx" ON "PollResult"("poll");

-- CreateIndex
CREATE INDEX "PollResult_member_idx" ON "PollResult"("member");

-- CreateIndex
CREATE INDEX "PollResult_createdBy_idx" ON "PollResult"("createdBy");

-- CreateIndex
CREATE INDEX "PollResult_updatedBy_idx" ON "PollResult"("updatedBy");

-- CreateIndex
CREATE INDEX "Post_state_idx" ON "Post"("state");

-- CreateIndex
CREATE INDEX "Post_ogImage_idx" ON "Post"("ogImage");

-- CreateIndex
CREATE INDEX "Post_author1_idx" ON "Post"("author1");

-- CreateIndex
CREATE INDEX "Post_author2_idx" ON "Post"("author2");

-- CreateIndex
CREATE INDEX "Post_author3_idx" ON "Post"("author3");

-- CreateIndex
CREATE INDEX "Post_section_idx" ON "Post"("section");

-- CreateIndex
CREATE INDEX "Post_category_idx" ON "Post"("category");

-- CreateIndex
CREATE INDEX "Post_classify_idx" ON "Post"("classify");

-- CreateIndex
CREATE INDEX "Post_topic_idx" ON "Post"("topic");

-- CreateIndex
CREATE INDEX "Post_heroImage_idx" ON "Post"("heroImage");

-- CreateIndex
CREATE INDEX "Post_ad1_idx" ON "Post"("ad1");

-- CreateIndex
CREATE INDEX "Post_ad2_idx" ON "Post"("ad2");

-- CreateIndex
CREATE INDEX "Post_poll_idx" ON "Post"("poll");

-- CreateIndex
CREATE INDEX "Post_createdBy_idx" ON "Post"("createdBy");

-- CreateIndex
CREATE INDEX "Post_updatedBy_idx" ON "Post"("updatedBy");

-- CreateIndex
CREATE INDEX "ReadingHistory_member_idx" ON "ReadingHistory"("member");

-- CreateIndex
CREATE INDEX "ReadingHistory_post_idx" ON "ReadingHistory"("post");

-- CreateIndex
CREATE INDEX "ReadingHistory_createdBy_idx" ON "ReadingHistory"("createdBy");

-- CreateIndex
CREATE INDEX "ReadingHistory_updatedBy_idx" ON "ReadingHistory"("updatedBy");

-- CreateIndex
CREATE INDEX "Section_createdBy_idx" ON "Section"("createdBy");

-- CreateIndex
CREATE INDEX "Section_updatedBy_idx" ON "Section"("updatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_heroImage_idx" ON "Tag"("heroImage");

-- CreateIndex
CREATE INDEX "Tag_createdBy_idx" ON "Tag"("createdBy");

-- CreateIndex
CREATE INDEX "Tag_updatedBy_idx" ON "Tag"("updatedBy");

-- CreateIndex
CREATE INDEX "Timeline_createdBy_idx" ON "Timeline"("createdBy");

-- CreateIndex
CREATE INDEX "Timeline_updatedBy_idx" ON "Timeline"("updatedBy");

-- CreateIndex
CREATE INDEX "TimelineItem_image_idx" ON "TimelineItem"("image");

-- CreateIndex
CREATE INDEX "TimelineItem_createdBy_idx" ON "TimelineItem"("createdBy");

-- CreateIndex
CREATE INDEX "TimelineItem_updatedBy_idx" ON "TimelineItem"("updatedBy");

-- CreateIndex
CREATE INDEX "Topic_heroImage_idx" ON "Topic"("heroImage");

-- CreateIndex
CREATE INDEX "Topic_createdBy_idx" ON "Topic"("createdBy");

-- CreateIndex
CREATE INDEX "Topic_updatedBy_idx" ON "Topic"("updatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdBy_idx" ON "User"("createdBy");

-- CreateIndex
CREATE INDEX "User_updatedBy_idx" ON "User"("updatedBy");

-- CreateIndex
CREATE INDEX "Video_coverPhoto_idx" ON "Video"("coverPhoto");

-- CreateIndex
CREATE INDEX "Video_createdBy_idx" ON "Video"("createdBy");

-- CreateIndex
CREATE INDEX "Video_updatedBy_idx" ON "Video"("updatedBy");

-- CreateIndex
CREATE UNIQUE INDEX "_Newsletter_ads_AB_unique" ON "_Newsletter_ads"("A", "B");

-- CreateIndex
CREATE INDEX "_Newsletter_ads_B_index" ON "_Newsletter_ads"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Attachment_posts_AB_unique" ON "_Attachment_posts"("A", "B");

-- CreateIndex
CREATE INDEX "_Attachment_posts_B_index" ON "_Attachment_posts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Newsletter_events_AB_unique" ON "_Newsletter_events"("A", "B");

-- CreateIndex
CREATE INDEX "_Newsletter_events_B_index" ON "_Newsletter_events"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_HomepagePick_posts_AB_unique" ON "_HomepagePick_posts"("A", "B");

-- CreateIndex
CREATE INDEX "_HomepagePick_posts_B_index" ON "_HomepagePick_posts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_HomepagePick_topics_AB_unique" ON "_HomepagePick_topics"("A", "B");

-- CreateIndex
CREATE INDEX "_HomepagePick_topics_B_index" ON "_HomepagePick_topics"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_locations_AB_unique" ON "_Post_locations"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_locations_B_index" ON "_Post_locations"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Member_interestedSections_AB_unique" ON "_Member_interestedSections"("A", "B");

-- CreateIndex
CREATE INDEX "_Member_interestedSections_B_index" ON "_Member_interestedSections"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Newsletter_focusPosts_AB_unique" ON "_Newsletter_focusPosts"("A", "B");

-- CreateIndex
CREATE INDEX "_Newsletter_focusPosts_B_index" ON "_Newsletter_focusPosts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Newsletter_relatedPosts_AB_unique" ON "_Newsletter_relatedPosts"("A", "B");

-- CreateIndex
CREATE INDEX "_Newsletter_relatedPosts_B_index" ON "_Newsletter_relatedPosts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Photo_posts_AB_unique" ON "_Photo_posts"("A", "B");

-- CreateIndex
CREATE INDEX "_Photo_posts_B_index" ON "_Photo_posts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_tags_AB_unique" ON "_Post_tags"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_tags_B_index" ON "_Post_tags"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Post_relatedPosts_AB_unique" ON "_Post_relatedPosts"("A", "B");

-- CreateIndex
CREATE INDEX "_Post_relatedPosts_B_index" ON "_Post_relatedPosts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Tag_topics_AB_unique" ON "_Tag_topics"("A", "B");

-- CreateIndex
CREATE INDEX "_Tag_topics_B_index" ON "_Tag_topics"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Timeline_items_AB_unique" ON "_Timeline_items"("A", "B");

-- CreateIndex
CREATE INDEX "_Timeline_items_B_index" ON "_Timeline_items"("B");

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_image_fkey" FOREIGN KEY ("image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_image_fkey" FOREIGN KEY ("image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_section_fkey" FOREIGN KEY ("section") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classify" ADD CONSTRAINT "Classify_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classify" ADD CONSTRAINT "Classify_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classify" ADD CONSTRAINT "Classify_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_image_fkey" FOREIGN KEY ("image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Config" ADD CONSTRAINT "Config_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_image_fkey" FOREIGN KEY ("image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationPV" ADD CONSTRAINT "DonationPV_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationPV" ADD CONSTRAINT "DonationPV_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_member_fkey" FOREIGN KEY ("member") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_post_fkey" FOREIGN KEY ("post") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepagePick" ADD CONSTRAINT "HomepagePick_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepagePick" ADD CONSTRAINT "HomepagePick_customImage_fkey" FOREIGN KEY ("customImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepagePick" ADD CONSTRAINT "HomepagePick_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepagePick" ADD CONSTRAINT "HomepagePick_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoGraph" ADD CONSTRAINT "InfoGraph_image_fkey" FOREIGN KEY ("image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoGraph" ADD CONSTRAINT "InfoGraph_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoGraph" ADD CONSTRAINT "InfoGraph_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_avatar_fkey" FOREIGN KEY ("avatar") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_poll_fkey" FOREIGN KEY ("poll") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_option1Image_fkey" FOREIGN KEY ("option1Image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_option2Image_fkey" FOREIGN KEY ("option2Image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_option3Image_fkey" FOREIGN KEY ("option3Image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_option4Image_fkey" FOREIGN KEY ("option4Image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_option5Image_fkey" FOREIGN KEY ("option5Image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResult" ADD CONSTRAINT "PollResult_poll_fkey" FOREIGN KEY ("poll") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResult" ADD CONSTRAINT "PollResult_member_fkey" FOREIGN KEY ("member") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResult" ADD CONSTRAINT "PollResult_post_fkey" FOREIGN KEY ("post") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResult" ADD CONSTRAINT "PollResult_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollResult" ADD CONSTRAINT "PollResult_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_ogImage_fkey" FOREIGN KEY ("ogImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_author1_fkey" FOREIGN KEY ("author1") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_author2_fkey" FOREIGN KEY ("author2") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_author3_fkey" FOREIGN KEY ("author3") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_section_fkey" FOREIGN KEY ("section") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_category_fkey" FOREIGN KEY ("category") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_classify_fkey" FOREIGN KEY ("classify") REFERENCES "Classify"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_topic_fkey" FOREIGN KEY ("topic") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_ad1_fkey" FOREIGN KEY ("ad1") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_ad2_fkey" FOREIGN KEY ("ad2") REFERENCES "Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_poll_fkey" FOREIGN KEY ("poll") REFERENCES "Poll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_member_fkey" FOREIGN KEY ("member") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_post_fkey" FOREIGN KEY ("post") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_image_fkey" FOREIGN KEY ("image") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_heroImage_fkey" FOREIGN KEY ("heroImage") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_coverPhoto_fkey" FOREIGN KEY ("coverPhoto") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_ads" ADD CONSTRAINT "_Newsletter_ads_A_fkey" FOREIGN KEY ("A") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_ads" ADD CONSTRAINT "_Newsletter_ads_B_fkey" FOREIGN KEY ("B") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Attachment_posts" ADD CONSTRAINT "_Attachment_posts_A_fkey" FOREIGN KEY ("A") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Attachment_posts" ADD CONSTRAINT "_Attachment_posts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_events" ADD CONSTRAINT "_Newsletter_events_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_events" ADD CONSTRAINT "_Newsletter_events_B_fkey" FOREIGN KEY ("B") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HomepagePick_posts" ADD CONSTRAINT "_HomepagePick_posts_A_fkey" FOREIGN KEY ("A") REFERENCES "HomepagePick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HomepagePick_posts" ADD CONSTRAINT "_HomepagePick_posts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HomepagePick_topics" ADD CONSTRAINT "_HomepagePick_topics_A_fkey" FOREIGN KEY ("A") REFERENCES "HomepagePick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HomepagePick_topics" ADD CONSTRAINT "_HomepagePick_topics_B_fkey" FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_locations" ADD CONSTRAINT "_Post_locations_A_fkey" FOREIGN KEY ("A") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_locations" ADD CONSTRAINT "_Post_locations_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Member_interestedSections" ADD CONSTRAINT "_Member_interestedSections_A_fkey" FOREIGN KEY ("A") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Member_interestedSections" ADD CONSTRAINT "_Member_interestedSections_B_fkey" FOREIGN KEY ("B") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_focusPosts" ADD CONSTRAINT "_Newsletter_focusPosts_A_fkey" FOREIGN KEY ("A") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_focusPosts" ADD CONSTRAINT "_Newsletter_focusPosts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_relatedPosts" ADD CONSTRAINT "_Newsletter_relatedPosts_A_fkey" FOREIGN KEY ("A") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Newsletter_relatedPosts" ADD CONSTRAINT "_Newsletter_relatedPosts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Photo_posts" ADD CONSTRAINT "_Photo_posts_A_fkey" FOREIGN KEY ("A") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Photo_posts" ADD CONSTRAINT "_Photo_posts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_tags" ADD CONSTRAINT "_Post_tags_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_tags" ADD CONSTRAINT "_Post_tags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_relatedPosts" ADD CONSTRAINT "_Post_relatedPosts_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Post_relatedPosts" ADD CONSTRAINT "_Post_relatedPosts_B_fkey" FOREIGN KEY ("B") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Tag_topics" ADD CONSTRAINT "_Tag_topics_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Tag_topics" ADD CONSTRAINT "_Tag_topics_B_fkey" FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Timeline_items" ADD CONSTRAINT "_Timeline_items_A_fkey" FOREIGN KEY ("A") REFERENCES "Timeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Timeline_items" ADD CONSTRAINT "_Timeline_items_B_fkey" FOREIGN KEY ("B") REFERENCES "TimelineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
