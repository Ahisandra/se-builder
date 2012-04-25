/*
* Copyright 2012 Sauce Labs
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

package com.sebuilder.interpreter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * A Selenium 2 script. To create and run a test, instantiate a Script object, add some Script.Steps
 * to its steps, then invoke "run". If you want to be able to run the script step by step, invoke
 * "start", which will return a TestRun object.
 * @author zarkonnen
 */
public class Script {
	ArrayList<Step> steps = new ArrayList<Step>();
	
	/** @return A TestRun object that can be iterated to run the script step by step. */
	public TestRun start() { return new TestRun(this); }
	
	/**
	 * Runs the script.
	 * @return Whether the run succeeded or failed.
	 * @throws RuntimeException If the script encountered a problem, including a failed Assertion or
	 *                          timed-out Wait.
	 */
	public boolean run() { return start().finish(); }
	
	@Override
	public String toString() {
		try { return toJSON().toString(4); } catch (JSONException e) { throw new RuntimeException(e); }
	}
	
	public JSONObject toJSON() throws JSONException {
		JSONObject o = new JSONObject();
		o.put("seleniumVersion", "2");
		o.put("formatVersion", 1);
		JSONArray stepsA = new JSONArray();
		for (Step s : steps) { stepsA.put(s.toJSON()); }
		return o;
	}
	
	/**
	 * A Selenium 2 step.
	 */
	public static class Step {
		/**
		 * Whether the step is negated. Only relevant for Assert/Verify/WaitFor steps.
		 */
		boolean negated;
		
		public Step(StepType type) {
			this.type = type;
		}
		
		StepType type;
		HashMap<String, String> stringParams = new HashMap<String, String>();
		HashMap<String, Locator> locatorParams = new HashMap<String, Locator>();

		boolean isNegated() {
			return negated;
		}
		
		@Override
		public String toString() {
			try { return toJSON().toString(); } catch (JSONException e) { throw new RuntimeException(e); }
		}
		
		public JSONObject toJSON() throws JSONException {
			JSONObject o = new JSONObject();
			if (type instanceof Assert) {
				o.put("type", "assert" + ((Assert) type).getter.getClass().getSimpleName());
			}
			if (type instanceof Verify) {
				o.put("type", "verify" + ((Verify) type).getter.getClass().getSimpleName());
			}
			if (type instanceof WaitFor) {
				o.put("type", "waitFor" + ((WaitFor) type).getter.getClass().getSimpleName());
			}
			if (type instanceof Store) {
				o.put("type", "store" + ((Store) type).getter.getClass().getSimpleName());
			}
			o.put("negated", negated);
			for (Map.Entry<String, String> pe : stringParams.entrySet()) {
				o.put(pe.getKey(), pe.getValue());
			}
			for (Map.Entry<String, Locator> le : locatorParams.entrySet()) {
				o.put(le.getKey(), le.getValue().toJSON());
			}
			
			return o;
		}
	}
}
