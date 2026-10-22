"use client";
import {createContext,useContext} from "react";
export const OperatorSampleContext=createContext(false);
export const useOperatorSample=()=>useContext(OperatorSampleContext);
