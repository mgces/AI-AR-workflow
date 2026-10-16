import assert from 'node:assert/strict';
import test from 'node:test';
import {preflightDetails} from '../dist/preflight-view.mjs';
test('missing historical preflight is not presented as zero failures',()=>{
 assert.match(preflightDetails({}),/未记录预检/);
});
test('preflight failures stay separate and unrecorded fixes are explicit',()=>{
 const html=preflightDetails({preflight_summary:{attempts:50,failed_attempts:4,issues:6},preflight_failures:[{id:'preflight-1',phase:'P5',verified_by:'preflight-2',resolution_status:'resolved',fixes:[],checks:[{id:'repeat',reason:'<script>bad</script>',rule_ids:['OAT.3']}]}]});
 assert.match(html,/50/);assert.match(html,/4/);assert.match(html,/未登记修复/);
 assert.ok(!html.includes('<script>'));assert.match(html,/OAT.3/);
});
