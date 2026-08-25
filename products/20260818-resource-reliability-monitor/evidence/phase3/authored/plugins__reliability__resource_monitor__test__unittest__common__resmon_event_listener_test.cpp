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

#include "resmon_event_listener.h"
#include "resmon_landing.h"
#include "resmon_mem_collector.h"
#include "resmon_ring_buffer.h"
#include "resmon_test_util.h"
#include "resmon_thr_collector.h"
#include "sys_event.h"

using namespace OHOS::HiviewDFX;

namespace {
// Named fixture values (G.CNS.02: no hard-to-understand literals).
constexpr int32_t EVT_PID = 12345;
constexpr size_t RING_CAPACITY = 4;
const std::string TEST_ROOT = "/data/test/resmon/event";

ResmonEventSubscribe MakeSub(const std::string &name, const std::string &suffix)
{
    ResmonEventSubscribe sub;
    sub.domain = "AAFWK";
    sub.name = name;
    sub.kind = "freeze";
    sub.suffix = suffix;
    return sub;
}

SysEvent MakeEvent(const std::string &domain, const std::string &name)
{
    SysEventCreator creator(domain, name, SysEventCreator::BEHAVIOR);
    creator.SetKeyValue("PID", EVT_PID);
    creator.SetKeyValue("PROCESS_NAME", "com.example.demo");
    return SysEvent("", nullptr, creator);
}

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

class ResmonEventListenerTest : public testing::Test {
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
 * @tc.name: ResmonEventListenerOnEvent
 * @tc.desc: a subscribed event writes a combined snapshot under event/
 * @tc.type: FUNC
 */
TEST_F(ResmonEventListenerTest, OnUnorderedEventTriggersSnapshot)
{
    ResmonEventListener listener;
    listener.subscribes_.push_back(MakeSub("THREAD_BLOCK_3S", "freeze"));
    ResmonLanding landing(TEST_ROOT);
    listener.deps_.landing = &landing;

    SysEvent evt = MakeEvent("AAFWK", "THREAD_BLOCK_3S");
    listener.OnUnorderedEvent(evt);

    std::string content = ConcatDir(TEST_ROOT + "/event");
    EXPECT_NE(content.find("event=THREAD_BLOCK_3S"), std::string::npos) << "事件到达触发综合快照落盘";
    EXPECT_NE(content.find("kind=freeze"), std::string::npos);
    EXPECT_NE(content.find("pid=12345"), std::string::npos);
    EXPECT_NE(content.find("process=com.example.demo"), std::string::npos);
}

/**
 * @tc.name: ResmonEventListenerEventNameFiltered
 * @tc.desc: events outside the subscription table are filtered out
 * @tc.type: FUNC
 */
TEST_F(ResmonEventListenerTest, EventNameFiltered)
{
    ResmonEventListener listener;
    listener.subscribes_.push_back(MakeSub("SCREEN_ON", "screen"));
    ResmonLanding landing(TEST_ROOT);
    listener.deps_.landing = &landing;

    SysEvent evt = MakeEvent("AAFWK", "THREAD_BLOCK_3S");
    listener.OnUnorderedEvent(evt);

    EXPECT_TRUE(ResmonTest::ListFiles(TEST_ROOT + "/event").empty()) << "订阅表外事件被过滤";
}

/**
 * @tc.name: ResmonEventListenerOomSnapshot
 * @tc.desc: an OOM-class event snapshot carries the memory watermark
 * @tc.type: FUNC
 */
TEST_F(ResmonEventListenerTest, OomSnapshotContent)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    ResmonTest::WriteFile(procDir + "/meminfo", "MemTotal:        2097152 kB\n"
                                                "MemAvailable:      65536 kB\n");

    ResmonEventListener listener;
    listener.subscribes_.push_back(MakeSub("LOWMEM_EVENT", "lowmem"));
    ResmonLanding landing(TEST_ROOT);
    listener.deps_.landing = &landing;
    ResmonMemCollector mem;
    mem.SetProcRoot(procDir);
    listener.deps_.memCollector = &mem;

    SysEvent evt = MakeEvent("AAFWK", "LOWMEM_EVENT");
    listener.OnUnorderedEvent(evt);

    std::string content = ConcatDir(TEST_ROOT + "/event");
    EXPECT_NE(content.find("[mem]"), std::string::npos) << "快照含水位与Top消费者";
    EXPECT_NE(content.find("MemAvailable"), std::string::npos);
    EXPECT_NE(content.find("kB ion="), std::string::npos) << "快照水位现场";
}

/**
 * @tc.name: ResmonEventListenerAnrSnapshot
 * @tc.desc: a freeze-class event snapshot carries the involved thread site
 * @tc.type: FUNC
 */
TEST_F(ResmonEventListenerTest, AnrSnapshotContent)
{
    const std::string procDir = TEST_ROOT + "/proc";
    ResmonTest::MakeDirs(procDir);
    ResmonTest::MakeDirs(procDir + "/7/task/7");
    ResmonTest::WriteFile(procDir + "/7/task/7/stat",
                          "7 (io_wait) D 1 1 1 0 -1 4194560 10 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0\n");

    ResmonEventListener listener;
    listener.subscribes_.push_back(MakeSub("THREAD_BLOCK_3S", "freeze"));
    ResmonLanding landing(TEST_ROOT);
    listener.deps_.landing = &landing;
    ResmonThrCollector thr;
    thr.SetProcRoot(procDir);
    listener.deps_.thrCollector = &thr;

    SysEvent evt = MakeEvent("AAFWK", "THREAD_BLOCK_3S");
    listener.OnUnorderedEvent(evt);

    std::string content = ConcatDir(TEST_ROOT + "/event");
    EXPECT_NE(content.find("[thr]"), std::string::npos) << "涉事进程现场快照";
    EXPECT_NE(content.find("io_wait"), std::string::npos);
    EXPECT_NE(content.find("R="), std::string::npos);
}

/**
 * @tc.name: ResmonEventListenerStabilitySnapshot
 * @tc.desc: a stability snapshot replays the pre-event ring buffer context
 * @tc.type: FUNC
 */
TEST_F(ResmonEventListenerTest, StabilitySnapshotWithRingContext)
{
    ResmonEventListener listener;
    listener.subscribes_.push_back(MakeSub("SCREEN_ON", "screen"));
    ResmonLanding landing(TEST_ROOT);
    listener.deps_.landing = &landing;
    ResmonRingBuffer ring(RING_CAPACITY);
    ring.Push("pre-tick-1");
    ring.Push("pre-tick-2");
    listener.deps_.ring = &ring;

    SysEvent evt = MakeEvent("POWER", "SCREEN_ON");
    listener.OnUnorderedEvent(evt);

    std::string content = ConcatDir(TEST_ROOT + "/event");
    EXPECT_NE(content.find("[pre-event]"), std::string::npos) << "环形缓冲回放现场";
    EXPECT_NE(content.find("pre-tick-1"), std::string::npos);
    EXPECT_NE(content.find("pre-tick-2"), std::string::npos);
}
