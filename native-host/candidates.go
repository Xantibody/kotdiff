package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// 1Password のログイン項目のうち、KOT 用とみなせるもの
type candidate struct {
	ID        string
	Title     string
	VaultID   string
	VaultName string
	Username  string
}

type opItem struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Vault struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"vault"`
	// op item list ではログイン項目のユーザー名がここに入る
	AdditionalInformation string `json:"additional_information"`
	URLs                  []struct {
		Href string `json:"href"`
	} `json:"urls"`
}

func (it opItem) toCandidate() candidate {
	return candidate{
		ID:        it.ID,
		Title:     it.Title,
		VaultID:   it.Vault.ID,
		VaultName: it.Vault.Name,
		Username:  it.AdditionalInformation,
	}
}

func findCandidates(itemList []byte) ([]candidate, error) {
	var items []opItem
	if err := json.Unmarshal(itemList, &items); err != nil {
		return nil, fmt.Errorf("op item list の出力を読めません: %w", err)
	}
	var found []candidate
	for _, it := range items {
		for _, u := range it.URLs {
			if strings.Contains(u.Href, "kingoftime.jp") {
				found = append(found, it.toCandidate())
				break
			}
		}
	}
	return found, nil
}

func (c candidate) label() string {
	return fmt.Sprintf("%s（%s / %s）", c.Title, c.VaultName, c.Username)
}

// 1 件ならそれを使い、複数なら番号で選んでもらう
func chooseCandidate(cands []candidate, in io.Reader, out io.Writer) (candidate, error) {
	switch len(cands) {
	case 0:
		return candidate{}, errors.New("URL に kingoftime.jp を含むログイン項目が見つかりません。--item <項目 ID> で指定してください")
	case 1:
		fmt.Fprintf(out, "1Password の項目 %s を使います\n", cands[0].label())
		return cands[0], nil
	}
	fmt.Fprintln(out, "KING OF TIME のログイン項目が複数見つかりました:")
	for i, c := range cands {
		fmt.Fprintf(out, "  %d) %s\n", i+1, c.label())
	}
	fmt.Fprint(out, "使う項目の番号: ")
	line, err := bufio.NewReader(in).ReadString('\n')
	if err != nil && line == "" {
		return candidate{}, fmt.Errorf("番号を読めません: %w", err)
	}
	n, err := strconv.Atoi(strings.TrimSpace(line))
	if err != nil || n < 1 || n > len(cands) {
		return candidate{}, fmt.Errorf("1〜%d の番号を入力してください", len(cands))
	}
	return cands[n-1], nil
}
