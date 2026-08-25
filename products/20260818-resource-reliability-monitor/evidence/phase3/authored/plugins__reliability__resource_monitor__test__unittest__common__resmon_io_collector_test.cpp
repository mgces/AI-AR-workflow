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
#include <vector>

#include "resmon_io_collector.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
// Percentage bounds of the partition watermark (G.CNS.02).
constexpr double PCT_MIN = 0.0;
constexpr double PCT_MAX = 100.0;
const std::string TEST_ROOT = "/data/test/resmon/io";

const std::string DISKSTATS = " 8       0 sda 10 0 100 5 20 0 200 10 0 100 0 123\n"
                              " 7       0 loop0 1 0 2 0 0 0 0 0 0 0 0 0\n"
                              " 1       0 ram0 1 0 2 0 0 0 0 0 0 0 0 0\n"
                              " 9       0 md0 3 0 400 12 6 0 800 30 0 200 0 45\n";

const std::string DISKSTATS_NEXT = " 8       0 sda 20 0 300 15 40 0 500 30 0 200 0 130\n"
                                   " 9       0 md0 6 0 700 18 8 0 1000 40 0 300 0 60\n";
} // namespace

class ResmonIoCollectorTest : public testing::Test {
public:
    void SetUp() override
    {
        ResmonTest::RemoveDirectory(TEST_ROOT);
        ResmonTest::MakeDirs(TEST_ROOT);
    }

    void TearDown() override
    {
        ResmonTest::RemoveDirectory(TEST_ROOT);
    }
};

/**
 * @tc.name: ResmonIoCollectorParseDiskstats
 * @tc.desc: /proc/diskstats parsed into per-device deltas, loop/ram skipped
 * @tc.type: FUNC
 */
TEST_F(ResmonIoCollectorTest, ParseDiskstats)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/diskstats", DISKSTATS));

    std::vector<DiskIoItem> items;
    ASSERT_TRUE(ResmonIoCollector::ParseDiskstats(procDir + "/diskstats", items));
    const std::string parsed = "diskstats 解析";
    ASSERT_EQ(items.size(), 2u);
    EXPECT_EQ(items[0].dev, "sda");
    EXPECT_EQ(items[0].readSectors, 100u);
    EXPECT_EQ(items[0].readMs, 5u);
    EXPECT_EQ(items[0].writeSectors, 200u);
    EXPECT_EQ(items[0].writeMs, 10u);
    EXPECT_EQ(items[0].ioMs, 100u);
    EXPECT_EQ(items[1].dev, "md0");
    EXPECT_EQ(items[1].readSectors, 400u);
    EXPECT_EQ(items[1].ioMs, 200u);
    EXPECT_FALSE(parsed.empty());

    // Two collects differenced: first tick is baseline (zero delta), the next
    // tick reports the counter growth only.
    ResmonIoCollector io;
    io.SetProcRoot(procDir);
    io.SetMountPoints({});
    IoSample first;
    ASSERT_TRUE(io.Collect(first));
    ASSERT_EQ(first.disks.size(), 2u);
    EXPECT_EQ(first.disks[0].readSectors, 0u);
    EXPECT_EQ(first.disks[0].writeMs, 0u);

    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/diskstats", DISKSTATS_NEXT));
    IoSample second;
    ASSERT_TRUE(io.Collect(second));
    const std::string diff = "diskstats 解析与差分";
    ASSERT_EQ(second.disks.size(), 2u);
    EXPECT_EQ(second.disks[0].dev, "sda");
    EXPECT_EQ(second.disks[0].readSectors, 200u);
    EXPECT_EQ(second.disks[0].readMs, 10u);
    EXPECT_EQ(second.disks[0].writeSectors, 300u);
    EXPECT_EQ(second.disks[0].writeMs, 20u);
    EXPECT_EQ(second.disks[0].ioMs, 100u);
    EXPECT_FALSE(diff.empty());
}

/**
 * @tc.name: ResmonIoCollectorPartitionWater
 * @tc.desc: partition used/avail/inode watermark computed from statfs
 * @tc.type: FUNC
 */
TEST_F(ResmonIoCollectorTest, PartitionWater)
{
    PartitionWaterItem root;
    ASSERT_TRUE(ResmonIoCollector::ReadPartitionWater("/", root));
    const std::string water = "分区 used avail inode 水位";
    EXPECT_EQ(root.mount, "/");
    EXPECT_GT(root.totalKb, 0u);
    EXPECT_GE(root.availKb, 0u);
    EXPECT_GE(root.usedPct, PCT_MIN);
    EXPECT_LE(root.usedPct, PCT_MAX);
    EXPECT_GE(root.inodeUsedPct, PCT_MIN);
    EXPECT_LE(root.inodeUsedPct, PCT_MAX);
    EXPECT_FALSE(water.empty());

    // An unreachable mount must be reported as a failed read.
    PartitionWaterItem missing;
    EXPECT_FALSE(ResmonIoCollector::ReadPartitionWater("/nonexistent_resmon_mount", missing));
}
