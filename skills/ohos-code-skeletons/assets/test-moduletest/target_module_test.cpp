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
// SKELETON: ohos_moduletest — end-to-end/behavioral test with REAL thresholds
// and real collaborators (not a pure unit). Lives under test/moduletest/.
#include <gtest/gtest.h>

#include "<header_under_test>.h"

using namespace testing::ext;
using namespace OHOS::<SUBSYSTEM_NS>;

namespace {
class <MTEST_SUITE> : public testing::Test {
public:
    static void SetUpTestCase(void) {}
    static void TearDownTestCase(void) {}
    void SetUp() {}
    void TearDown() {}
};

/**
 * @tc.name: <MTEST_SUITE>_<MCASE_NAME>
 * @tc.desc: end-to-end: drive the real path with a real threshold and assert the
 *           real transition (e.g. warning -> fault at <REAL_THRESHOLD>).
 * @tc.type: FUNC
 * @tc.level: Level1
 */
HWTEST_F(<MTEST_SUITE>, <MTEST_SUITE>_<MCASE_NAME>, TestSize.Level1)
{
    <TYPE_UNDER_TEST> obj;
    // drive to the REAL threshold (moduletest uses real values, not mocks)
    auto decision = obj.<METHOD_UNDER_TEST>(<REAL_THRESHOLD>);
    EXPECT_EQ(decision, <EXPECTED_DECISION>);
}
} // namespace
