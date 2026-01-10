import React, { useState } from 'react';

function ToDoList(){

    const [task, settask] = useState([]);
    const [newtask, setnewtask] = useState('');

    function handleChange(event){
        setnewtask(event.target.value);

    }
    
    function addTask(){
        settask([...task, newtask]);
        setnewtask('');

    }

    function deleteTask(index){ 
        const updatedtask = task.filter((_,i)=>i !== index);
        settask(updatedtask);

    }

    function editTask(index){

    }

    function moveTaskup(index){
        if(index>0){
        const updatedtask=[...task];
        [updatedtask[index],updatedtask[index-1]]=[updatedtask[index-1],updatedtask[index]];
        settask(updatedtask);
        }
    
    }

    function moveTaskdown(index){

        if(index<task.length-1){
        const updatedtask=[...task];
        [updatedtask[index],updatedtask[index+1]]=[updatedtask[index+1],updatedtask[index]];
        settask(updatedtask);
        }
    
    }
    



    return(
        <div className='to-do-list'>
            <h1>To-Do List</h1>
            <div className='add-task'>
                <input type='text' placeholder='Enter a task' 
                value={newtask}
                onChange={handleChange}/>
                <button onClick={addTask}>Add Task</button>
        </div>
        <ol>
            {task.map((task, index) => 
                <li key={index}>
                <span>{task}</span>
                <button>Edit </button>
                <button onClick={()=>deleteTask(index)}>Delete </button>
                <button onClick={()=>moveTaskup(index)}>⬆️</button>
                <button onClick={()=>moveTaskdown(index)}>⬇️</button>
                </li>

            )}</ol>
        </div>

    )
    
}

export default ToDoList;