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

#include "resmon_net_collector.h"
#include "resmon_test_util.h"

using namespace OHOS::HiviewDFX;

namespace {
const std::string TEST_ROOT = "/data/test/resmon/net";

const std::string NET_DEV = "Inter-|   Receive                                                |  Transmit\n"
                            " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs "
                            "drop fifo colls carrier compressed\n"
                            "    lo: 100 1 0 0 0 0 0 0 200 2 0 0 0 0 0 0\n"
                            "  eth0: 1000 10 1 2 0 0 0 0 2000 20 0 3 0 0 0 0\n"
                            " wlan0: 500 5 0 0 0 0 0 0 800 8 0 1 0 0 0 0\n";

const std::string NET_DEV_NEXT = "Inter-|   Receive                                                |  Transmit\n"
                                 " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets "
                                 "errs drop fifo colls carrier compressed\n"
                                 "    lo: 300 3 0 0 0 0 0 0 600 6 0 0 0 0 0 0\n"
                                 "  eth0: 1600 20 1 2 0 0 0 0 2600 30 0 3 0 0 0 0\n"
                                 " wlan0: 800 10 0 1 0 0 0 0 1200 15 0 1 0 0 0 0\n";
} // namespace

class ResmonNetCollectorTest : public testing::Test {
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
 * @tc.name: ResmonNetCollectorParseNetDev
 * @tc.desc: /proc/net/dev aggregated over all non-loopback interfaces
 * @tc.type: FUNC
 */
TEST_F(ResmonNetCollectorTest, ParseNetDev)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    ResmonTest::MakeDirs(procDir + "/net");
    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/net/dev", NET_DEV));

    NetSample out;
    ASSERT_TRUE(ResmonNetCollector::ParseNetDev(procDir + "/net/dev", out));
    const std::string parsed = "netdev 解析";
    EXPECT_EQ(out.rxBytes, 1500u);
    EXPECT_EQ(out.rxPackets, 15u);
    EXPECT_EQ(out.rxErrors, 1u);
    EXPECT_EQ(out.rxDropped, 2u);
    EXPECT_EQ(out.txBytes, 2800u);
    EXPECT_EQ(out.txPackets, 28u);
    EXPECT_FALSE(parsed.empty());
}

/**
 * @tc.name: ResmonNetCollectorNetDevDelta
 * @tc.desc: two ticks differenced into per-tick interface deltas
 * @tc.type: FUNC
 */
TEST_F(ResmonNetCollectorTest, NetDevDelta)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    ResmonTest::MakeDirs(procDir + "/net");
    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/net/dev", NET_DEV));

    ResmonNetCollector net;
    net.SetProcRoot(procDir);
    NetSample first;
    ASSERT_TRUE(net.Collect(first));
    EXPECT_EQ(first.rxBytes, 1500u);
    EXPECT_EQ(first.txBytes, 2800u);

    ASSERT_TRUE(ResmonTest::WriteFile(procDir + "/net/dev", NET_DEV_NEXT));
    NetSample second;
    ASSERT_TRUE(net.Collect(second));
    const std::string diff = "netdev 两拍差分";
    EXPECT_EQ(second.rxBytes, 900u);
    EXPECT_EQ(second.rxPackets, 15u);
    EXPECT_EQ(second.rxErrors, 0u);
    EXPECT_EQ(second.rxDropped, 1u);
    EXPECT_EQ(second.txBytes, 1000u);
    EXPECT_EQ(second.txPackets, 17u);
    EXPECT_FALSE(diff.empty());
}
