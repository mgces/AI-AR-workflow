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
// SKELETON: ohos_fuzztest entry. Replace <...> placeholders (README.md).
// Lives under test/fuzztest/<fuzzer_dir>/.
#include "<fuzzer_name>_fuzzer.h"

#include <cstddef>
#include <cstdint>

#include "<header_under_test>.h"

namespace OHOS {
bool <FuzzEntry>FuzzTest(const uint8_t* data, size_t size)
{
    if (data == nullptr || size == 0) {
        return false;
    }
    // TODO: feed fuzzed bytes into the CHANGED code path's parser/entry.
    // Build inputs from data/size and call <METHOD_UNDER_TEST>.
    <TYPE_UNDER_TEST> obj;
    (void)obj; // TODO: obj.<METHOD_UNDER_TEST>(...);
    return true;
}
} // namespace OHOS

/* Fuzzer entry — libFuzzer calls this repeatedly with mutated input. */
extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size)
{
    OHOS::<FuzzEntry>FuzzTest(data, size);
    return 0;
}
