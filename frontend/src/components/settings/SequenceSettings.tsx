import { MdArrowBackIosNew } from "react-icons/md";

export function SequenceSettings() {
    return (
        <div id="courses">
            <h2 className="text-xl font-medium text-palette-rich-teal mt-10">
                Sequence
            </h2>
            <p className="mb-8">View and manage your sequence-related settings.</p>
            <div className="max-w-80 mb-10 gap-3 flex flex-col">
                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Current Semester
                    </p>
                    <select className="border-1 rounded-md min-w-20">
                    {/* TODO: ADD API */}
                        <option>1A</option>
                        <option>1B</option>
                        <option>WT1</option>
                        <option>2A</option>
                    </select>
                </div>

                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Sequence
                    </p>
                    <select className="border-1 rounded-md min-w-20">
                    {/* TODO: ADD API */}
                        <option>SEQ1</option>
                        <option>SEQ2</option>
                        <option>SEQ3</option>
                        <option>SEQ4</option>
                    </select>
                </div>
                
                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Started Year
                    </p>
                    <p>2024</p>
                </div>

                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Started Semester
                    </p>
                    <p>Fall</p>
                </div>
            
                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Graduation Year
                    </p>
                    <p>2029</p>
                </div>

                <div className="flex flex-row justify-between">
                    <p className="text-lg">
                        Coop?
                    </p>
                    <input type="checkbox" className="w-4 rounded-full accent-dark-green "/>
                </div>

                <div>
                    <p className="text-lg">
                        Path
                    </p>
                    <div className="flex flex-row justify-between align-middle mt-2 max-w-60">
                        <div className="w-11 aspect-square bg-dark-green rounded-lg text-light-green text-center leading-11 font-semibold">1A</div>
                        <MdArrowBackIosNew className="w-5 h-auto rotate-180"/>
                        <div className="w-11 aspect-square bg-dark-green rounded-lg text-light-green text-center leading-11 font-semibold">1B</div>
                        <MdArrowBackIosNew className="w-5 h-auto rotate-180"/>
                        <div className="w-11 aspect-square bg-dark-green rounded-lg text-light-green text-center leading-11 font-semibold">2A</div>
                    </div>
                    <div className="flex flex-row justify-between align-middle mt-2 max-w-60">
                        <div className="w-11 aspect-square bg-dark-green rounded-lg text-light-green text-center leading-11 font-semibold">WT1</div>
                        <MdArrowBackIosNew className="w-5 h-auto rotate-180"/>
                        <div className="w-11 aspect-square bg-green-500 rounded-lg text-light-green text-center leading-11 font-semibold">2B</div>
                        <MdArrowBackIosNew className="w-5 h-auto rotate-180"/>
                        <div className="w-11 aspect-square bg-dark-green rounded-lg text-light-green text-center leading-11 font-semibold">Off</div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
                <button style={true ? 
                    {} :  
                    {backgroundColor:"#aba5a561", color: "oklch(55.2% 0.016 285.938)", borderWidth:"0", cursor:"not-allowed"}} 
                    className="p-1 rounded-md font-medium cursor-pointer border border-gray-500 text-settings-text px-3 hover:bg-dark-green hover:text-light-green duration-150"
                    // disabled={loadingState != "Save Changes"}
                    // onClick={()=>{if (loadingState == "Save Changes") initialSetup(); setLoadingState("No Changes")}}
                >
                    Cancel
                </button>
                <button 
                    // onClick={handleSubmit} 
                    // disabled={loadingState != "Save Changes"}
                    style={true ? 
                    {} :  
                    {backgroundColor:"#aba5a561", color: "oklch(55.2% 0.016 285.938)", borderColor:"oklch(70.4% 0.04 256.788)", cursor:"not-allowed"}} 
                    className="p-1 rounded-md font-medium cursor-pointer bg-dark-green text-white duration-150 px-3 hover:bg-[#2c464a]">
                    Save Changes
                </button>
            </div>
        </div>
    );
}
