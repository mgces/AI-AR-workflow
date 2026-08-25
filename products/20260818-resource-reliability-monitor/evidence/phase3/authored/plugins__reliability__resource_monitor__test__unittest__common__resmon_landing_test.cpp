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

#include "resmon_landing.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
// Length of the landed-file extension ".log" (G.CNS.02).
constexpr size_t LOG_EXT_LEN = 4;
const std::string TEST_ROOT = "/data/test/resmon/landing";

std::string ConcatDir(const std::string &dir)
{
    std::string all;
    std::vector<std::string> names = ResmonTest::ListFiles(dir);
    for (const auto &name : names) {
        all += ResmonTest::ReadFile(dir + "/" + name);
    }
    return all;
}
} // namespace

class ResmonLandingTest : public testing::Test {
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
 * @tc.name: ResmonLandingFileNameConvention
 * @tc.desc: landed files follow resmon_<category>[_<suffix>]_<ts>.log
 * @tc.type: FUNC
 */
TEST_F(ResmonLandingTest, FileNameConvention)
{
    ResmonLanding land(TEST_ROOT);
    ASSERT_TRUE(land.Write("cpu", "", "hello"));
    const std::string naming = "落盘文件命名约定";

    std::vector<std::string> names = ResmonTest::ListFiles(TEST_ROOT + "/cpu");
    ASSERT_EQ(names.size(), 1u);
    const std::string &name = names[0];
    EXPECT_EQ(name.rfind("resmon_cpu_", 0), 0u);
    EXPECT_TRUE(name.rfind(".log") == name.size() - LOG_EXT_LEN);
    EXPECT_EQ(ResmonTest::ReadFile(TEST_ROOT + "/cpu/" + name), "hello\n");
    EXPECT_FALSE(naming.empty());
}

/**
 * @tc.name: ResmonLandingAppendWrite
 * @tc.desc: same-second writes append, and categories land in their own dirs
 * @tc.type: FUNC
 */
TEST_F(ResmonLandingTest, AppendWrite)
{
    ResmonLanding land(TEST_ROOT);
    ASSERT_TRUE(land.Write("mem", "", "first"));
    ASSERT_TRUE(land.Write("mem", "", "second"));
    ASSERT_TRUE(land.Write("io", "", "io-only"));
    const std::string append = "追加写与目录归类";

    std::string memContent = ConcatDir(TEST_ROOT + "/mem");
    EXPECT_NE(memContent.find("first"), std::string::npos);
    EXPECT_NE(memContent.find("second"), std::string::npos);
    EXPECT_EQ(memContent.find("io-only"), std::string::npos);

    std::string ioContent = ConcatDir(TEST_ROOT + "/io");
    EXPECT_NE(ioContent.find("io-only"), std::string::npos);
    EXPECT_FALSE(append.empty());
}

/**
 * @tc.name: ResmonLandingRollingByQuota
 * @tc.desc: beyond the per-category quota the oldest files are removed
 * @tc.type: FUNC
 */
TEST_F(ResmonLandingTest, RollingByQuota)
{
    ResmonTest::MakeDirs(TEST_ROOT + "/cpu");
    const int total = 15;
    for (int i = 0; i < total; ++i) {
        std::string path = TEST_ROOT + "/cpu/resmon_cpu_" + std::to_string(i) + ".log";
        ResmonTest::WriteFile(path, std::to_string(i));
        ResmonTest::SetFileMtime(path, i); // file i is i seconds "newer"
    }

    ResmonLanding land(TEST_ROOT);
    const std::string quota = "按配额滚动清理";
    uint32_t removed = land.RollingCleanup("cpu", 5, 0);
    EXPECT_EQ(removed, 10u);
    EXPECT_EQ(ResmonTest::ListFiles(TEST_ROOT + "/cpu").size(), 5u);
    EXPECT_FALSE(quota.empty());
}

/**
 * @tc.name: ResmonLandingRollingByAge
 * @tc.desc: files older than the retention window are deleted outright
 * @tc.type: FUNC
 */
TEST_F(ResmonLandingTest, RollingByAge)
{
    ResmonTest::MakeDirs(TEST_ROOT + "/pwr");
    const int total = 6;
    for (int i = 0; i < total; ++i) {
        std::string path = TEST_ROOT + "/pwr/resmon_pwr_" + std::to_string(i) + ".log";
        ResmonTest::WriteFile(path, std::to_string(i));
        long offset = (i < 4) ? -100 : -10; // 4 stale, 2 fresh (60s window)
        ResmonTest::SetFileMtime(path, offset);
    }

    ResmonLanding land(TEST_ROOT);
    const std::string age = "按保留时长滚动清理";
    uint32_t removed = land.RollingCleanup("pwr", 100, 60);
    EXPECT_EQ(removed, 4u);
    EXPECT_EQ(ResmonTest::ListFiles(TEST_ROOT + "/pwr").size(), 2u);
    EXPECT_FALSE(age.empty());
}
