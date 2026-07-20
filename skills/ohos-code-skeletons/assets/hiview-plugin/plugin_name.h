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
// SKELETON: hiview plugin header. Replace <...> placeholders (see README.md),
// rename this file to <plugin_file>.h, and keep the Plugin lifecycle overrides
// you need (delete IsInterestedPipelineEvent/OnEvent for a poll-only plugin).
#ifndef HIVIEW_PLUGINS_<PLUGIN_GUARD>_H
#define HIVIEW_PLUGINS_<PLUGIN_GUARD>_H

#include <memory>
#include <mutex>
#include <string>

#include "event.h"
#include "plugin.h"

namespace OHOS {
namespace HiviewDFX {
// A hiview plugin derives from Plugin and is registered with REGISTER(...) in
// the .cpp. Hiview constructs it, calls OnLoad() at startup, routes pipeline
// events through OnEvent() (gated by IsInterestedPipelineEvent), and OnUnload()
// at teardown.
class <PLUGIN_NAME> : public Plugin {
public:
    <PLUGIN_NAME>();
    ~<PLUGIN_NAME>();

    // Called once when the plugin is loaded — start timers/FFRT tasks, read
    // system parameters, subscribe to events here.
    void OnLoad() override;
    // Called once when the plugin is unloaded — stop tasks, release resources.
    void OnUnload() override;

    // OPTIONAL (event-driven plugins): return true only for events this plugin
    // wants OnEvent() to receive; keep it cheap. Delete both if poll-only.
    bool IsInterestedPipelineEvent(std::shared_ptr<Event> event) override;
    // Handle a routed event. Return true if consumed. Delete if poll-only.
    bool OnEvent(std::shared_ptr<Event>& event) override;

private:
    // TODO: real work entry points, e.g.:
    void <PLUGIN_WORK_METHOD>();

    std::atomic<bool> hasLoaded_ { false };
    std::mutex mutex_;
};
} // namespace HiviewDFX
} // namespace OHOS
#endif // HIVIEW_PLUGINS_<PLUGIN_GUARD>_H
