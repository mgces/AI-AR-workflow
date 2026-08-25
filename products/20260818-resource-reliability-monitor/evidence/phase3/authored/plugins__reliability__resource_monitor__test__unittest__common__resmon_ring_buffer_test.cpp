/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
#include <gtest/gtest.h>

#include <string>

#include "resmon_ring_buffer.h"

using namespace OHOS::HiviewDFX;

/**
 * @tc.name: ResmonRingBufferPushRoll
 * @tc.desc: a fixed-capacity ring drops the oldest line on overflow
 * @tc.type: FUNC
 */
TEST(ResmonRingBufferTest, PushRoll)
{
    ResmonRingBuffer ring(3);
    const std::string covered = "环形缓冲定长滚动";
    ring.Push("tick-a");
    ring.Push("tick-b");
    ring.Push("tick-c");
    ring.Push("tick-d");
    ring.Push("tick-e");
    EXPECT_EQ(ring.Size(), 3u);
    std::string text = ring.DrainAsText();
    EXPECT_EQ(text, "tick-c\ntick-d\ntick-e\n");
    EXPECT_FALSE(covered.empty());
}

/**
 * @tc.name: ResmonRingBufferDrainSnapshotContext
 * @tc.desc: drain exports the recent N lines as pre-event context
 * @tc.type: FUNC
 */
TEST(ResmonRingBufferTest, DrainSnapshotContext)
{
    ResmonRingBuffer ring(4);
    const std::string covered = "导出事件前现场回放";
    ring.Push("sample-1");
    ring.Push("sample-2");
    std::string text = ring.DrainAsText();
    EXPECT_EQ(text, "sample-1\nsample-2\n");
    EXPECT_EQ(ring.Size(), 2u);
    EXPECT_FALSE(covered.empty());
}
