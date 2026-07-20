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
// SKELETON: ohos_unittest fixture. Replace <...> placeholders (README.md).
// Lives under the component's test/ dir — this satisfies the pipeline's
// "P3/P4/P5 may add INDEPENDENT test files only" rule (test/ path => not a
// functional-fingerprint drift).
#include <gtest/gtest.h>

#include "<header_under_test>.h"

using namespace testing::ext;
using namespace OHOS::<SUBSYSTEM_NS>;

namespace {
class <TEST_SUITE> : public testing::Test {
public:
    static void SetUpTestCase(void) {}    // once before all cases
    static void TearDownTestCase(void) {} // once after all cases
    void SetUp() {}                       // before each case
    void TearDown() {}                    // after each case
};

/**
 * @tc.name: <TEST_SUITE>_<CASE_NAME>
 * @tc.desc: <one-line: what behavior this verifies>
 * @tc.type: FUNC
 * @tc.level: Level1
 */
HWTEST_F(<TEST_SUITE>, <TEST_SUITE>_<CASE_NAME>, TestSize.Level1)
{
    // Arrange: build inputs / state for the CHANGED code path.
    <TYPE_UNDER_TEST> obj;
    // Act:
    auto result = obj.<METHOD_UNDER_TEST>();
    // Assert:
    EXPECT_EQ(result, <EXPECTED_VALUE>);
}
} // namespace
