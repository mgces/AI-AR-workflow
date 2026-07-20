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
// SKELETON: hiview plugin implementation. Replace <...> placeholders (README.md).
// The REGISTER(<PLUGIN_NAME>) line is MANDATORY — without it hiview never loads
// the plugin. Include "plugin_factory.h" for the REGISTER macro.
#include "<plugin_file>.h"

#include "hiview_logger.h"
#include "plugin_factory.h"

namespace OHOS {
namespace HiviewDFX {
DEFINE_LOG_TAG("<PLUGIN_LOG_TAG>");

// MANDATORY: register the plugin with hiview's factory. Deleting this line makes
// the plugin invisible to hiview (compiles fine, never runs).
REGISTER(<PLUGIN_NAME>);

<PLUGIN_NAME>::<PLUGIN_NAME>() {}

<PLUGIN_NAME>::~<PLUGIN_NAME>() {}

void <PLUGIN_NAME>::OnLoad()
{
    HIVIEW_LOGI("<PLUGIN_NAME> OnLoad");
    hasLoaded_ = true;
    // TODO: start FFRT poll task / read system parameters / subscribe events.
    // Emit your <RUNTIME_MARKER> on the changed code path so P4 can prove it ran.
}

void <PLUGIN_NAME>::OnUnload()
{
    HIVIEW_LOGI("<PLUGIN_NAME> OnUnload");
    hasLoaded_ = false;
    // TODO: stop tasks, release resources.
}

// OPTIONAL (delete for poll-only plugins):
bool <PLUGIN_NAME>::IsInterestedPipelineEvent(std::shared_ptr<Event> event)
{
    // TODO: return true only for events this plugin handles.
    return false;
}

bool <PLUGIN_NAME>::OnEvent(std::shared_ptr<Event>& event)
{
    // TODO: handle the event; return true if consumed.
    return false;
}

void <PLUGIN_NAME>::<PLUGIN_WORK_METHOD>()
{
    std::lock_guard<std::mutex> lock(mutex_);
    // TODO: the plugin's real work. Emit <E2E_MARKER> only after a real
    // end-to-end result so P4's e2e gate can key on it.
}
} // namespace HiviewDFX
} // namespace OHOS
